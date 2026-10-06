package rest.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.PrevisionCommandeService;
import rest.service.impl.prevision.AlertesLigne;
import rest.service.impl.prevision.Prevision;
import rest.service.impl.prevision.Recommandation;

/**
 * Analyse Suggestion / Commande (plan d'octobre, section 5, lot L12). Voir {@link PrevisionCommandeService}.
 * <p>
 * Le calcul lit tout en quelques requetes groupees (ventes mensuelles sur 36 mois, stocks, commandes en cours, liens
 * DCI), calcule en memoire ({@link Prevision}, {@link Recommandation}) puis remplace les lignes de t_prevision_produit
 * de l'emplacement. Les ecrans ne lisent que cette table : aucun calcul lourd a l'affichage.
 */
@Stateless
public class PrevisionCommandeServiceImpl implements PrevisionCommandeService {

    private static final Logger LOG = Logger.getLogger(PrevisionCommandeServiceImpl.class.getName());

    /** Historique lu pour la prevision (mois complets). */
    static final int MOIS_HISTORIQUE = 36;
    /** Historique conserve en base et affiche (mois complets). */
    static final int MOIS_AFFICHES = 24;
    /** Une commande non recue depuis plus longtemps n'est plus comptee « en cours » (commande oubliee). */
    static final int JOURS_COMMANDE_EN_COURS = 45;
    /** En dessous de 3 mois d'historique, le produit est « nouveau » : ni rotation lente ni surstock sans vente. */
    static final int MOIS_NOUVEAU = 3;

    private static final String LIEN_ACTIF = " (fd.str_STATUT IS NULL OR fd.str_STATUT = '' OR fd.str_STATUT = 'enable') ";
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter MOIS = DateTimeFormatter.ofPattern("MMM yy", Locale.FRANCE);

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /* ------------------------------------------------------------------ outils */

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }

    private static double reel(Object v) {
        return v instanceof Number ? ((Number) v).doubleValue() : 0;
    }

    private static String texte(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static LocalDateTime dateHeure(Object v) {
        if (v instanceof Timestamp) {
            return ((Timestamp) v).toLocalDateTime();
        }
        if (v instanceof LocalDateTime) {
            return (LocalDateTime) v;
        }
        if (v instanceof java.util.Date) {
            return new Timestamp(((java.util.Date) v).getTime()).toLocalDateTime();
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String parametre(String cle, String defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? defaut : String.valueOf(r.get(0));
    }

    int entierParametre(String cle, int defaut) {
        try {
            return Integer.parseInt(parametre(cle, String.valueOf(defaut)).trim());
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    private AlertesLigne.Seuils seuils() {
        AlertesLigne.Seuils s = new AlertesLigne.Seuils();
        s.surstockJours = entierParametre("KEY_PREVISION_SURSTOCK_JOURS", 90);
        s.rotationLenteJours = entierParametre("KEY_PREVISION_ROTATION_LENTE_JOURS", 180);
        s.ecartAberrant = entierParametre("KEY_PREVISION_ECART_ABERRANT", 3);
        s.prixEcartPct = entierParametre("KEY_PREVISION_PRIX_ECART", 15);
        return s;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, Object... p) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        List<Object> r = q.getResultList();
        List<Object[]> l = new ArrayList<>(r.size());
        for (Object o : r) {
            l.add(o instanceof Object[] ? (Object[]) o : new Object[] { o });
        }
        return l;
    }

    /* ------------------------------------------------------------------ calcul */

    /** Ce que le calcul sait d'un produit. */
    static final class Produit {
        final String id;
        String nom, grossiste, cle;
        int paf, stock, reserve, enCours, equivalents, delai;
        boolean detail;
        final double[] ventes = new double[MOIS_HISTORIQUE];
        LocalDateTime derniereVente;

        Produit(String id) {
            this.id = id;
        }
    }

    @Override
    public JSONObject recalculer(String emplacementId, String origine) {
        long t0 = System.currentTimeMillis();
        LocalDateTime debut = LocalDateTime.now();
        try {
            YearMonth courant = YearMonth.now();
            YearMonth premier = courant.minusMonths(MOIS_HISTORIQUE);
            Map<String, Produit> produits = new HashMap<>();
            /* produits actifs (vendus a l'unite : les produits deconditionnes sont ecartes, comme pour les ruptures) */
            for (Object[] r : lignes("SELECT f.lg_FAMILLE_ID, f.str_NAME, f.lg_GROSSISTE_ID, COALESCE(f.int_PAF, 0),"
                    + " COALESCE(f.bool_DECONDITIONNE, 0) FROM t_famille f WHERE f.str_STATUT = 'enable'")) {
                Produit p = new Produit(texte(r[0]));
                p.nom = texte(r[1]);
                p.grossiste = texte(r[2]);
                p.paf = entier(r[3]);
                p.detail = entier(r[4]) == 1;
                produits.put(p.id, p);
            }
            Set<String> suivis = new HashSet<>();
            /* ventes mensuelles (ventes cloturees, non annulees, hors avoirs) des vendeurs de l'emplacement */
            for (Object[] r : lignes("SELECT d.lg_FAMILLE_ID,"
                    + " PERIOD_DIFF(DATE_FORMAT(p.dt_UPDATED, '%Y%m'), ?2) AS m, SUM(d.int_QUANTITY), MAX(p.dt_UPDATED)"
                    + " FROM t_preenregistrement p JOIN t_preenregistrement_detail d"
                    + "   ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                    + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = ?1"
                    + " WHERE p.dt_UPDATED >= ?3 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
                    + " GROUP BY d.lg_FAMILLE_ID, m", emplacementId,
                    premier.format(DateTimeFormatter.ofPattern("yyyyMM")),
                    Timestamp.valueOf(premier.atDay(1).atStartOfDay()))) {
                Produit p = produits.get(texte(r[0]));
                if (p == null || p.detail) {
                    continue;
                }
                int m = entier(r[1]);
                if (m >= 0 && m < MOIS_HISTORIQUE) {
                    p.ventes[m] += Math.max(0, reel(r[2]));
                }
                LocalDateTime dv = dateHeure(r[3]);
                if (dv != null && (p.derniereVente == null || dv.isAfter(p.derniereVente))) {
                    p.derniereVente = dv;
                }
                suivis.add(p.id);
            }
            for (Object[] r : lignes("SELECT lg_FAMILLE_ID, SUM(int_NUMBER_AVAILABLE) FROM t_famille_stock"
                    + " WHERE lg_EMPLACEMENT_ID = ?1 GROUP BY lg_FAMILLE_ID", emplacementId)) {
                Produit p = produits.get(texte(r[0]));
                if (p != null && !p.detail) {
                    p.stock = entier(r[1]);
                    if (p.stock > 0) {
                        suivis.add(p.id);
                    }
                }
            }
            for (Object[] r : lignes(
                    "SELECT lg_FAMILLE_ID, SUM(int_NUMBER) FROM t_type_stock_famille"
                            + " WHERE lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = ?1 GROUP BY lg_FAMILLE_ID",
                    emplacementId)) {
                Produit p = produits.get(texte(r[0]));
                if (p != null && !p.detail) {
                    p.reserve = Math.max(0, entier(r[1]));
                    if (p.reserve > 0) {
                        suivis.add(p.id);
                    }
                }
            }
            for (Object[] r : lignes("SELECT od.lg_FAMILLE_ID, SUM(od.int_NUMBER) FROM t_order_detail od"
                    + " JOIN t_order o ON o.lg_ORDER_ID = od.lg_ORDER_ID WHERE o.str_STATUT IN ('is_Process', 'passed')"
                    + " AND o.dt_UPDATED >= ?1 GROUP BY od.lg_FAMILLE_ID",
                    Timestamp.valueOf(LocalDate.now().minusDays(JOURS_COMMANDE_EN_COURS).atStartOfDay()))) {
                Produit p = produits.get(texte(r[0]));
                if (p != null) {
                    p.enCours = Math.max(0, entier(r[1]));
                }
            }
            Map<String, Integer> delais = new HashMap<>();
            for (Object[] r : lignes(
                    "SELECT lg_GROSSISTE_ID, COALESCE(int_DELAI_REAPPROVISIONNEMENT, 0) FROM t_grossiste")) {
                delais.put(texte(r[0]), entier(r[1]));
            }
            int delaiDefaut = Math.max(0, entierParametre("KEY_PREVISION_DELAI_JOURS", 3));
            int couvertureVoulue = Math.max(0, entierParametre("KEY_PREVISION_COUVERTURE_JOURS", 15));
            equivalentsDirects(produits);

            List<Object[]> sortie = new ArrayList<>();
            long poids = 0, fiabilitePonderee = 0;
            for (String id : suivis) {
                Produit p = produits.get(id);
                Integer d = p.grossiste == null ? null : delais.get(p.grossiste);
                p.delai = d != null && d > 0 ? d : delaiDefaut;
                double[] serie = depuisPremiereVente(p.ventes);
                Prevision.Resultat r = Prevision.analyser(serie);
                int stockTotal = Math.max(0, p.stock) + p.reserve;
                int recommande = Recommandation.quantite(r.parJour(), r.ecartTypeMois, p.delai, couvertureVoulue,
                        stockTotal, p.enCours, p.equivalents);
                int couverture = Recommandation.couverture(stockTotal, p.enCours, r.parJour());
                int ventes12 = (int) Math.round(somme(p.ventes, MOIS_HISTORIQUE - 12, MOIS_HISTORIQUE));
                StringBuilder erreurs = new StringBuilder();
                for (int i = 0; i < r.methodes.length; i++) {
                    erreurs.append(i > 0 ? "," : "").append(r.methodes[i]).append(':').append(r.erreurs[i]);
                }
                double[] affiche = Arrays.copyOfRange(serie, Math.max(0, serie.length - MOIS_AFFICHES), serie.length);
                StringBuilder h = new StringBuilder();
                for (int i = 0; i < affiche.length; i++) {
                    h.append(i > 0 ? "," : "").append((long) Math.round(affiche[i]));
                }
                sortie.add(new Object[] { id, emplacementId, r.methode, r.prevuMois,
                        Math.round(r.ecartTypeMois * 100) / 100.0, r.fiabilite, erreurs.toString(), h.toString(),
                        ventes12, p.derniereVente == null ? null : Timestamp.valueOf(p.derniereVente), stockTotal,
                        p.enCours, p.equivalents, p.delai, couverture < 0 ? null : Math.min(couverture, 99999),
                        recommande });
                if (ventes12 > 0) {
                    poids += ventes12;
                    fiabilitePonderee += (long) ventes12 * r.fiabilite;
                }
            }
            em.createNativeQuery("DELETE FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = ?1")
                    .setParameter(1, emplacementId).executeUpdate();
            inserer(sortie);
            Integer fiabilite = poids > 0 ? (int) Math.round((double) fiabilitePonderee / poids) : null;
            em.createNativeQuery("INSERT INTO t_prevision_calcul (lg_EMPLACEMENT_ID, debut, fin, produits,"
                    + " fiabilite_moyenne, origine) VALUES (?1, ?2, NOW(), ?3, ?4, ?5)").setParameter(1, emplacementId)
                    .setParameter(2, Timestamp.valueOf(debut)).setParameter(3, sortie.size()).setParameter(4, fiabilite)
                    .setParameter(5, origine == null ? "DEMANDE" : origine).executeUpdate();
            LOG.log(Level.INFO, "Previsions de commande : {0} produits en {1} ms",
                    new Object[] { sortie.size(), System.currentTimeMillis() - t0 });
            return new JSONObject().put("success", true).put("produits", sortie.size())
                    .put("fiabilite", fiabilite == null ? JSONObject.NULL : fiabilite)
                    .put("duree", System.currentTimeMillis() - t0);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "calcul des previsions de commande", e);
            return new JSONObject().put("success", false).put("message", "Le calcul des prévisions a échoué.");
        }
    }

    /** La serie commence a la premiere vente : les mois d'avant n'existaient pas pour le produit. */
    static double[] depuisPremiereVente(double[] ventes) {
        int i = 0;
        while (i < ventes.length && ventes[i] <= 0) {
            i++;
        }
        return Arrays.copyOfRange(ventes, i, ventes.length);
    }

    private static double somme(double[] s, int de, int a) {
        double t = 0;
        for (int i = Math.max(0, de); i < a && i < s.length; i++) {
            t += s[i];
        }
        return t;
    }

    /**
     * Stock des equivalents DCI DIRECTS de chaque produit : meme association de DCI, meme dosage et meme forme
     * ({@link SubstitutionArticle}, regle de la suggestion), produits vendus a la boite seulement, stock du rayon.
     */
    private void equivalentsDirects(Map<String, Produit> produits) {
        Map<String, List<Produit>> parCle = new HashMap<>();
        for (Object[] r : lignes("SELECT fd.lg_FAMILLE_ID,"
                + " GROUP_CONCAT(DISTINCT fd.lg_DCI_ID ORDER BY fd.lg_DCI_ID SEPARATOR ',') FROM t_famille_dci fd WHERE"
                + LIEN_ACTIF + " GROUP BY fd.lg_FAMILLE_ID")) {
            Produit p = produits.get(texte(r[0]));
            if (p != null && r[1] != null) {
                p.cle = texte(r[1]);
                parCle.computeIfAbsent(p.cle, k -> new ArrayList<>()).add(p);
            }
        }
        for (List<Produit> groupe : parCle.values()) {
            if (groupe.size() < 2) {
                continue;
            }
            for (Produit p : groupe) {
                if (p.detail) {
                    continue;
                }
                int total = 0;
                for (Produit c : groupe) {
                    if (c == p || c.detail || c.stock <= 0) {
                        continue;
                    }
                    SubstitutionArticle.Verdict v = SubstitutionArticle.comparer(p.nom, c.nom);
                    if (v != null && SubstitutionArticle.DIRECT.equals(v.niveau)) {
                        total += c.stock;
                    }
                }
                p.equivalents = total;
            }
        }
    }

    private void inserer(List<Object[]> lignes) {
        final int parLot = 250;
        for (int de = 0; de < lignes.size(); de += parLot) {
            List<Object[]> lot = lignes.subList(de, Math.min(lignes.size(), de + parLot));
            StringBuilder sql = new StringBuilder("INSERT INTO t_prevision_produit (lg_FAMILLE_ID, lg_EMPLACEMENT_ID,"
                    + " methode, prevu_mois, ecart_type_mois, fiabilite, erreurs, historique, ventes_12_mois, derniere_vente,"
                    + " stock, en_cours, equivalents, delai_jours, couverture_jours, recommande, dt_CALCUL) VALUES ");
            int n = 0;
            for (int i = 0; i < lot.size(); i++) {
                sql.append(i > 0 ? "," : "").append('(');
                for (int k = 0; k < 16; k++) {
                    sql.append('?').append(++n).append(',');
                }
                sql.append("NOW())");
            }
            Query q = em.createNativeQuery(sql.toString());
            n = 0;
            for (Object[] l : lot) {
                for (Object v : l) {
                    q.setParameter(++n, v);
                }
            }
            q.executeUpdate();
        }
    }

    /* ------------------------------------------------------------------ lecture */

    @Override
    public JSONObject tableau(String emplacementId) {
        JSONObject o = new JSONObject().put("success", true);
        List<Object[]> c = lignes("SELECT DATE_FORMAT(fin, '%d/%m/%Y %H:%i'), produits, fiabilite_moyenne, origine"
                + " FROM t_prevision_calcul WHERE lg_EMPLACEMENT_ID = ?1 AND fin IS NOT NULL ORDER BY id DESC LIMIT 1",
                emplacementId);
        if (c.isEmpty()) {
            return o.put("calcule", false);
        }
        o.put("calcule", true).put("dernierCalcul", c.get(0)[0]).put("origine", c.get(0)[3]);
        AlertesLigne.Seuils s = seuils();
        Object[] r = lignes("SELECT COUNT(*)," + " COALESCE(SUM(CASE WHEN p.ventes_12_mois > 0 THEN 1 ELSE 0 END), 0),"
                + " COALESCE(SUM(CASE WHEN p.prevu_mois >= 1 THEN 1 ELSE 0 END), 0),"
                + " COALESCE(SUM(CASE WHEN p.prevu_mois >= 1 AND p.stock <= 0 THEN 1 ELSE 0 END), 0),"
                + " COALESCE(SUM(CASE WHEN p.stock > 0 AND (p.derniere_vente IS NULL OR p.derniere_vente < ?2)"
                + "   THEN p.stock * f.int_PAF ELSE 0 END), 0),"
                + " COALESCE(SUM(CASE WHEN p.stock > 0 AND (p.derniere_vente IS NULL OR p.derniere_vente < ?2)"
                + "   THEN 1 ELSE 0 END), 0),"
                + " AVG(CASE WHEN p.ventes_12_mois > 0 AND p.couverture_jours IS NOT NULL THEN LEAST(p.couverture_jours, 365) END),"
                + " COALESCE(SUM(CASE WHEN p.ventes_12_mois > 0 THEN p.fiabilite * p.ventes_12_mois ELSE 0 END), 0),"
                + " COALESCE(SUM(p.ventes_12_mois), 0),"
                + " COALESCE(SUM(CASE WHEN p.recommande > 0 THEN 1 ELSE 0 END), 0),"
                + " COALESCE(SUM(p.recommande * f.int_PAF), 0),"
                + " COALESCE(SUM(CASE WHEN p.couverture_jours > ?3 THEN 1 ELSE 0 END), 0)"
                + " FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID"
                + " WHERE p.lg_EMPLACEMENT_ID = ?1", emplacementId,
                Timestamp.valueOf(LocalDate.now().minusDays(s.rotationLenteJours).atStartOfDay()), s.surstockJours)
                        .get(0);
        int vendus = entier(r[2]);
        long poids = (long) reel(r[8]);
        o.put("produits", entier(r[0])).put("produitsVendus", entier(r[1]))
                .put("tauxRupture", vendus > 0 ? Math.round(entier(r[3]) * 1000.0 / vendus) / 10.0 : 0)
                .put("ruptures", entier(r[3])).put("produitsReguliers", vendus).put("valeurInvendus", (long) reel(r[4]))
                .put("invendus", entier(r[5]))
                .put("couvertureMoyenne", r[6] == null ? JSONObject.NULL : Math.round(reel(r[6])))
                .put("fiabilite", poids > 0 ? Math.round(reel(r[7]) / poids) : JSONObject.NULL)
                .put("aCommander", entier(r[9])).put("valeurACommander", (long) reel(r[10]))
                .put("surstock", entier(r[11])).put("joursLente", s.rotationLenteJours)
                .put("joursSurstock", s.surstockJours);
        JSONArray methodes = new JSONArray();
        for (Object[] m : lignes(
                "SELECT methode, COUNT(*), ROUND(AVG(fiabilite)) FROM t_prevision_produit"
                        + " WHERE lg_EMPLACEMENT_ID = ?1 AND ventes_12_mois > 0 GROUP BY methode ORDER BY 2 DESC",
                emplacementId)) {
            methodes.put(
                    new JSONObject().put("methode", m[0]).put("produits", entier(m[1])).put("fiabilite", entier(m[2])));
        }
        JSONArray evolution = new JSONArray();
        for (Object[] m : lignes("SELECT DATE_FORMAT(fin, '%d/%m'), fiabilite_moyenne FROM (SELECT * FROM"
                + " t_prevision_calcul WHERE lg_EMPLACEMENT_ID = ?1 AND fin IS NOT NULL ORDER BY id DESC LIMIT 30) x"
                + " ORDER BY id", emplacementId)) {
            evolution.put(
                    new JSONObject().put("jour", m[0]).put("fiabilite", m[1] == null ? JSONObject.NULL : entier(m[1])));
        }
        return o.put("methodes", methodes).put("evolution", evolution);
    }

    private static final String COLONNES = "SELECT p.lg_FAMILLE_ID, f.str_NAME, f.int_CIP, p.methode, p.prevu_mois,"
            + " p.fiabilite, p.ventes_12_mois, DATE_FORMAT(p.derniere_vente, '%d/%m/%Y'), p.stock, p.en_cours,"
            + " p.equivalents, p.delai_jours, p.couverture_jours, p.recommande, COALESCE(f.int_PAF, 0),"
            + " (SELECT g.str_LIBELLE FROM t_grossiste g WHERE g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID), p.historique";

    private static JSONObject ligne(Object[] r) {
        return new JSONObject().put("id", r[0]).put("nom", r[1]).put("cip", r[2]).put("methode", r[3])
                .put("prevuMois", reel(r[4])).put("fiabilite", entier(r[5])).put("ventes12", entier(r[6]))
                .put("derniereVente", r[7] == null ? "" : r[7]).put("stock", entier(r[8])).put("enCours", entier(r[9]))
                .put("equivalents", entier(r[10])).put("delai", entier(r[11]))
                .put("couverture", r[12] == null ? JSONObject.NULL : entier(r[12])).put("recommande", entier(r[13]))
                .put("paf", entier(r[14])).put("valeur", (long) entier(r[13]) * entier(r[14]))
                .put("grossiste", r[15] == null ? "" : r[15]).put("historique", r[16] == null ? "" : r[16]);
    }

    @Override
    public JSONObject previsions(String emplacementId, String filtre, String recherche, int start, int limit) {
        AlertesLigne.Seuils s = seuils();
        StringBuilder where = new StringBuilder(" FROM t_prevision_produit p JOIN t_famille f"
                + " ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_EMPLACEMENT_ID = ?1");
        List<Object> params = new ArrayList<>();
        params.add(emplacementId);
        String tri = " ORDER BY p.ventes_12_mois DESC, f.str_NAME";
        String f = filtre == null ? "" : filtre.trim().toUpperCase(Locale.ROOT);
        switch (f) {
        case "ACOMMANDER":
            where.append(" AND p.recommande > 0");
            tri = " ORDER BY p.recommande * f.int_PAF DESC, f.str_NAME";
            break;
        case "RUPTURE":
            where.append(" AND p.prevu_mois >= 1 AND p.stock <= 0");
            break;
        case "SURSTOCK":
            where.append(" AND p.couverture_jours > ").append(s.surstockJours);
            tri = " ORDER BY p.stock * f.int_PAF DESC, f.str_NAME";
            break;
        case "LENTE":
            where.append(" AND p.stock > 0 AND (p.derniere_vente IS NULL OR p.derniere_vente < ?2)");
            params.add(Timestamp.valueOf(LocalDate.now().minusDays(s.rotationLenteJours).atStartOfDay()));
            tri = " ORDER BY p.stock * f.int_PAF DESC, f.str_NAME";
            break;
        case "PEU_FIABLE":
            where.append(" AND p.ventes_12_mois > 0 AND p.fiabilite < 50");
            break;
        default:
            break;
        }
        String r = recherche == null ? "" : recherche.trim();
        if (!r.isEmpty()) {
            params.add("%" + r.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
            int n = params.size();
            where.append(" AND (f.str_NAME LIKE ?").append(n).append(" OR f.int_CIP LIKE ?").append(n).append(')');
        }
        int debut = Math.max(0, start), taille = limit <= 0 ? 25 : Math.min(limit, 500);
        long total = (long) reel(lignes("SELECT COUNT(*)" + where, params.toArray()).get(0)[0]);
        JSONArray data = new JSONArray();
        for (Object[] x : lignes(COLONNES + where + tri + " LIMIT " + taille + " OFFSET " + debut, params.toArray())) {
            data.put(ligne(x));
        }
        return new JSONObject().put("success", true).put("total", total).put("data", data);
    }

    @Override
    public JSONObject produit(String emplacementId, String familleId) {
        List<Object[]> r = lignes(COLONNES
                + ", p.ecart_type_mois, p.erreurs FROM t_prevision_produit p JOIN t_famille f"
                + " ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_EMPLACEMENT_ID = ?1 AND p.lg_FAMILLE_ID = ?2",
                emplacementId, familleId);
        if (r.isEmpty()) {
            return new JSONObject().put("success", false).put("message",
                    "Pas de prévision pour ce produit (jamais vendu ni en stock, ou calcul pas encore fait).");
        }
        Object[] x = r.get(0);
        JSONObject o = ligne(x).put("success", true);
        double ecartType = reel(x[17]);
        /* historique : les derniers mois complets, le plus recent etant le mois dernier */
        String[] h = String.valueOf(o.get("historique")).isEmpty() ? new String[0]
                : String.valueOf(o.get("historique")).split(",");
        YearMonth dernier = YearMonth.now().minusMonths(1);
        JSONArray mois = new JSONArray();
        for (int i = 0; i < h.length; i++) {
            mois.put(new JSONObject().put("mois", dernier.minusMonths(h.length - 1L - i).format(MOIS)).put("ventes",
                    Long.parseLong(h[i].trim())));
        }
        o.put("mois", mois).put("prochainMois", dernier.plusMonths(1).format(MOIS));
        JSONArray methodes = new JSONArray();
        String erreurs = texte(x[18]);
        if (erreurs != null && !erreurs.isEmpty()) {
            for (String e : erreurs.split(",")) {
                String[] kv = e.split(":");
                if (kv.length == 2) {
                    methodes.put(new JSONObject().put("methode", kv[0]).put("erreur", Double.parseDouble(kv[1]))
                            .put("retenue", kv[0].equals(o.getString("methode"))));
                }
            }
        }
        o.put("methodes", methodes);
        /* le detail du calcul de la quantite recommandee, pour l'expliquer a l'ecran */
        int couverture = Math.max(0, entierParametre("KEY_PREVISION_COUVERTURE_JOURS", 15));
        double parJour = o.getDouble("prevuMois") / 30.0;
        int delai = o.getInt("delai");
        double besoin = parJour * (delai + couverture);
        double securite = Recommandation.Z_95 * (ecartType / Math.sqrt(30)) * Math.sqrt(Math.max(1, delai));
        o.put("calcul",
                new JSONObject().put("parJour", Math.round(parJour * 100) / 100.0).put("delai", delai)
                        .put("couvertureVoulue", couverture).put("besoin", Math.round(besoin * 10) / 10.0)
                        .put("securite", Math.round(securite * 10) / 10.0).put("ecartType", ecartType));
        return o;
    }

    @Override
    public JSONObject aAnalyser(String emplacementId) {
        JSONArray data = new JSONArray();
        for (Object[] r : lignes("SELECT s.lg_SUGGESTION_ORDER_ID, s.str_REF, g.str_LIBELLE,"
                + " DATE_FORMAT(s.dt_UPDATED, '%d/%m/%Y %H:%i'), s.str_STATUT,"
                + " (SELECT COUNT(*) FROM t_suggestion_order_details d WHERE d.lg_SUGGESTION_ORDER_ID = s.lg_SUGGESTION_ORDER_ID)"
                + " FROM t_suggestion_order s LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = s.lg_GROSSISTE_ID"
                + " ORDER BY s.dt_UPDATED DESC LIMIT 40")) {
            data.put(new JSONObject().put("type", SUGGESTION).put("id", r[0]).put("ref", r[1] == null ? "" : r[1])
                    .put("grossiste", r[2] == null ? "" : r[2]).put("date", r[3])
                    .put("statut", r[4] == null ? "" : r[4]).put("lignes", entier(r[5])));
        }
        for (Object[] r : lignes("SELECT o.lg_ORDER_ID, o.str_REF_ORDER, g.str_LIBELLE,"
                + " DATE_FORMAT(o.dt_UPDATED, '%d/%m/%Y %H:%i'), o.str_STATUT,"
                + " (SELECT COUNT(*) FROM t_order_detail d WHERE d.lg_ORDER_ID = o.lg_ORDER_ID)"
                + " FROM t_order o LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                + " WHERE o.str_STATUT IN ('is_Process', 'passed') ORDER BY o.dt_UPDATED DESC LIMIT 40")) {
            data.put(new JSONObject().put("type", COMMANDE).put("id", r[0]).put("ref", r[1] == null ? "" : r[1])
                    .put("grossiste", r[2] == null ? "" : r[2]).put("date", r[3])
                    .put("statut", r[4] == null ? "" : r[4]).put("lignes", entier(r[5])));
        }
        return new JSONObject().put("success", true).put("data", data);
    }

    @Override
    public JSONObject analyser(String emplacementId, String type, String id) {
        boolean commande = COMMANDE.equals(type);
        if (!commande && !SUGGESTION.equals(type)) {
            return new JSONObject().put("success", false).put("message", "Type inconnu : SUGGESTION ou COMMANDE.");
        }
        List<Object[]> entete = commande
                ? lignes("SELECT o.str_REF_ORDER, g.str_LIBELLE, o.str_STATUT, o.lg_GROSSISTE_ID FROM t_order o"
                        + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID WHERE o.lg_ORDER_ID = ?1",
                        id)
                : lignes("SELECT s.str_REF, g.str_LIBELLE, s.str_STATUT, s.lg_GROSSISTE_ID FROM t_suggestion_order s"
                        + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = s.lg_GROSSISTE_ID"
                        + " WHERE s.lg_SUGGESTION_ORDER_ID = ?1", id);
        if (entete.isEmpty()) {
            return new JSONObject().put("success", false).put("message",
                    commande ? "Commande introuvable." : "Suggestion introuvable.");
        }
        boolean commandeEnCours = commande
                && ("is_Process".equals(texte(entete.get(0)[2])) || "passed".equals(texte(entete.get(0)[2])));
        String sql = commande ? "SELECT d.lg_FAMILLE_ID, f.str_NAME, f.int_CIP, SUM(COALESCE(d.int_NUMBER, 0)),"
                + " MAX(COALESCE(NULLIF(d.int_PAF_DETAIL, 0), NULLIF(d.prixAchat, 0), f.int_PAF, 0))"
                + " FROM t_order_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " WHERE d.lg_ORDER_ID = ?1 GROUP BY d.lg_FAMILLE_ID, f.str_NAME, f.int_CIP ORDER BY f.str_NAME"
                : "SELECT d.lg_FAMILLE_ID, f.str_NAME, f.int_CIP, SUM(COALESCE(d.int_NUMBER, 0)),"
                        + " MAX(COALESCE(NULLIF(d.int_PAF_DETAIL, 0), f.int_PAF, 0))"
                        + " FROM t_suggestion_order_details d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                        + " WHERE d.lg_SUGGESTION_ORDER_ID = ?1 GROUP BY d.lg_FAMILLE_ID, f.str_NAME, f.int_CIP"
                        + " ORDER BY f.str_NAME";
        List<Object[]> lignes = lignes(sql, id);
        Map<String, Object[]> prev = new HashMap<>();
        Map<String, Boolean> indispo = new HashMap<>();
        Map<String, Integer> dernierPrix = new HashMap<>();
        if (!lignes.isEmpty()) {
            for (Object[] p : lignes(
                    "SELECT p.lg_FAMILLE_ID, p.prevu_mois, p.ecart_type_mois, p.stock, p.en_cours,"
                            + " p.equivalents, p.delai_jours, p.derniere_vente, p.historique, p.fiabilite, p.methode"
                            + " FROM t_prevision_produit p WHERE p.lg_EMPLACEMENT_ID = ?1 AND p.lg_FAMILLE_ID IN"
                            + " (SELECT x.lg_FAMILLE_ID FROM "
                            + (commande ? "t_order_detail x WHERE x.lg_ORDER_ID = ?2"
                                    : "t_suggestion_order_details x WHERE x.lg_SUGGESTION_ORDER_ID = ?2")
                            + ")",
                    emplacementId, id)) {
                prev.put(texte(p[0]), p);
            }
            for (Object[] d : lignes("SELECT y.lg_FAMILLE_ID, y.str_STATUT FROM t_disponibilite_produit y JOIN"
                    + " (SELECT lg_FAMILLE_ID AS f, MAX(dt_CREATED) AS dt FROM t_disponibilite_produit WHERE lg_SOURCE_ID = ?1"
                    + " GROUP BY lg_FAMILLE_ID) x ON x.f = y.lg_FAMILLE_ID AND x.dt = y.dt_CREATED WHERE y.lg_SOURCE_ID = ?1",
                    id)) {
                indispo.put(texte(d[0]), "NON".equals(texte(d[1])));
            }
            for (Object[] a : lignes("SELECT bd.lg_FAMILLE_ID, bd.int_PAF FROM t_bon_livraison_detail bd"
                    + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID"
                    + " JOIN (SELECT bd2.lg_FAMILLE_ID AS f, MAX(b2.dt_UPDATED) AS dt FROM t_bon_livraison_detail bd2"
                    + "   JOIN t_bon_livraison b2 ON b2.lg_BON_LIVRAISON_ID = bd2.lg_BON_LIVRAISON_ID"
                    + "   WHERE b2.str_STATUT = 'is_Closed' AND bd2.lg_FAMILLE_ID IN (SELECT x.lg_FAMILLE_ID FROM "
                    + (commande ? "t_order_detail x WHERE x.lg_ORDER_ID = ?1"
                            : "t_suggestion_order_details x WHERE x.lg_SUGGESTION_ORDER_ID = ?1")
                    + ") GROUP BY bd2.lg_FAMILLE_ID) z ON z.f = bd.lg_FAMILLE_ID AND z.dt = b.dt_UPDATED"
                    + " WHERE b.str_STATUT = 'is_Closed' AND COALESCE(bd.int_PAF, 0) > 0", id)) {
                dernierPrix.putIfAbsent(texte(a[0]), entier(a[1]));
            }
        }
        AlertesLigne.Seuils s = seuils();
        int couvertureVoulue = Math.max(0, entierParametre("KEY_PREVISION_COUVERTURE_JOURS", 15));
        int delaiDefaut = Math.max(0, entierParametre("KEY_PREVISION_DELAI_JOURS", 3));
        JSONArray data = new JSONArray();
        Map<String, Integer> compte = new LinkedHashMap<>();
        long valeurProposee = 0, valeurRecommandee = 0;
        int lignesAlerte = 0;
        for (Object[] l : lignes) {
            String fid = texte(l[0]);
            Object[] p = prev.get(fid);
            AlertesLigne.Ligne a = new AlertesLigne.Ligne();
            a.quantite = entier(l[3]);
            a.prixLigne = entier(l[4]);
            a.prixDernierAchat = dernierPrix.getOrDefault(fid, 0);
            a.indisponible = Boolean.TRUE.equals(indispo.get(fid));
            int delai = delaiDefaut;
            double ecartType = 0;
            if (p != null) {
                a.prevuMois = reel(p[1]);
                ecartType = reel(p[2]);
                a.stock = entier(p[3]);
                /* une commande en cours compte deja dans « en cours » : on ne la compte pas deux fois */
                a.enCours = Math.max(0, entier(p[4]) - (commandeEnCours ? a.quantite : 0));
                a.equivalents = entier(p[5]);
                delai = entier(p[6]) > 0 ? entier(p[6]) : delaiDefaut;
                LocalDateTime dv = dateHeure(p[7]);
                a.joursSansVente = dv == null ? -1 : (int) ChronoUnit.DAYS.between(dv.toLocalDate(), LocalDate.now());
                String h = texte(p[8]);
                a.nouveau = h == null || h.isEmpty() || h.split(",").length < MOIS_NOUVEAU;
            } else {
                a.nouveau = true;
            }
            a.recommande = Recommandation.quantite(a.prevuMois / 30.0, ecartType, delai, couvertureVoulue, a.stock,
                    a.enCours, a.equivalents);
            List<AlertesLigne.Alerte> al = AlertesLigne.alertes(a, s);
            JSONArray alertes = new JSONArray();
            boolean grave = false;
            for (AlertesLigne.Alerte x : al) {
                alertes.put(new JSONObject().put("code", x.code).put("texte", x.texte).put("grave", x.grave));
                compte.merge(x.code, 1, Integer::sum);
                grave |= x.grave;
            }
            if (!al.isEmpty()) {
                lignesAlerte++;
            }
            valeurProposee += (long) a.quantite * a.prixLigne;
            valeurRecommandee += (long) a.recommande * a.prixLigne;
            int couverture = Recommandation.couverture(a.stock, a.enCours, a.prevuMois / 30.0);
            data.put(new JSONObject().put("id", fid).put("nom", l[1]).put("cip", l[2]).put("quantite", a.quantite)
                    .put("recommande", a.recommande).put("ecart", a.quantite - a.recommande)
                    .put("prevuMois", a.prevuMois).put("stock", a.stock).put("enCours", a.enCours)
                    .put("equivalents", a.equivalents).put("couverture", couverture < 0 ? JSONObject.NULL : couverture)
                    .put("prix", a.prixLigne).put("dernierPrix", a.prixDernierAchat)
                    .put("fiabilite", p == null ? JSONObject.NULL : entier(p[9]))
                    .put("methode", p == null ? "" : texte(p[10])).put("nouveau", a.nouveau).put("alertes", alertes)
                    .put("grave", grave));
        }
        JSONObject resume = new JSONObject().put("lignes", lignes.size()).put("lignesAlerte", lignesAlerte)
                .put("valeurProposee", valeurProposee).put("valeurRecommandee", valeurRecommandee);
        compte.forEach(resume::put);
        Object[] e = entete.get(0);
        return new JSONObject().put("success", true).put("type", type).put("ref", e[0] == null ? "" : e[0])
                .put("grossiste", e[1] == null ? "" : e[1]).put("statut", e[2] == null ? "" : e[2])
                .put("resume", resume).put("data", data).put("calcule", !prev.isEmpty() || lignes.isEmpty());
    }

    /** Pour les messages : une date au format de l'ecran. */
    static String jour(LocalDate d) {
        return d == null ? "" : d.format(JOUR);
    }
}
