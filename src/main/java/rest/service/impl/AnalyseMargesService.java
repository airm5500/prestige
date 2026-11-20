package rest.service.impl;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 13/10 (point 21) : onglet « Analyse » de la marge sur produits vendus.
 * <p>
 * Meme perimetre que la liste (« Marge sur produits vendus ») : ventes de l'emplacement de l'utilisateur, cloturees,
 * non annulees, de montant positif, hors depot extension. HT = TTC - remise - TVA ; achat = prix d'achat x quantite ;
 * marge = HT - achat. Taux de marque = marge / HT (le « % Marge » de la liste) ; taux de marge = marge / achat.
 * Comparaisons : periode precedente de meme duree, moyennes mensuelles des 3 et des 6 mois complets qui precedent.
 * Objectifs reglables : vert a l'objectif ou au-dessus, rouge en dessous. Lecture seule (hors objectifs).
 */
@Stateless
public class AnalyseMargesService {

    public static final String OBJECTIF_MARQUE = "KEY_OBJECTIF_TAUX_MARQUE";
    public static final String OBJECTIF_MARGE = "KEY_OBJECTIF_TAUX_MARGE";

    static final String FROM = " FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
            + " WHERE p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 AND u.lg_EMPLACEMENT_ID = ?3 AND p.str_STATUT = 'is_Closed'"
            + " AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID NOT LIKE '5'";
    static final String MONTANTS = "SUM(d.int_PRICE), SUM(IFNULL(d.int_PRICE_REMISE, 0)), SUM(IFNULL(d.montantTva, 0)),"
            + " SUM(IFNULL(d.prixAchat, 0) * d.int_QUANTITY)";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    static long n(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    static double taux(long marge, long base) {
        return base == 0 ? 0 : Math.round(marge * 10000.0 / base) / 100.0;
    }

    /** Indicateurs d'une periode a partir de TTC, remise, TVA, achat. */
    static JSONObject indicateurs(long ttc, long remise, long tva, long achat) {
        long ht = ttc - remise - tva, marge = ht - achat;
        return new JSONObject().put("ttc", ttc).put("ht", ht).put("achat", achat).put("marge", marge)
                .put("tauxMarque", taux(marge, ht)).put("tauxMarge", taux(marge, achat));
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, LocalDate debut, LocalDate fin, String emplacement) {
        return em.createNativeQuery(sql).setParameter(1, debut.toString()).setParameter(2, fin.plusDays(1).toString())
                .setParameter(3, emplacement).getResultList();
    }

    /**
     * Montants par jour (TTC, remise, TVA, achat) sur toute la plage utile, en UNE requete : chaque periode de
     * l'analyse (choisie, precedente, moyennes, six mois) s'en deduit par cumul (10 s -> moins d'1 s sur le banc).
     */
    private java.util.TreeMap<LocalDate, long[]> parJour(LocalDate debut, LocalDate fin, String emplacement) {
        java.util.TreeMap<LocalDate, long[]> jours = new java.util.TreeMap<>();
        for (Object[] l : lignes("SELECT DATE(p.dt_UPDATED), " + MONTANTS + FROM + " GROUP BY DATE(p.dt_UPDATED)",
                debut, fin, emplacement)) {
            LocalDate j = l[0] instanceof java.sql.Date ? ((java.sql.Date) l[0]).toLocalDate()
                    : LocalDate.parse(String.valueOf(l[0]).substring(0, 10));
            jours.put(j, new long[] { n(l[1]), n(l[2]), n(l[3]), n(l[4]) });
        }
        return jours;
    }

    static JSONObject periode(java.util.TreeMap<LocalDate, long[]> jours, LocalDate debut, LocalDate fin) {
        long[] t = new long[4];
        for (long[] j : jours.subMap(debut, true, fin, true).values()) {
            for (int i = 0; i < 4; i++) {
                t[i] += j[i];
            }
        }
        return indicateurs(t[0], t[1], t[2], t[3]).put("debut", debut.toString()).put("fin", fin.toString());
    }

    /** Moyenne mensuelle des n mois complets avant le mois de « debut ». */
    static JSONObject moyenneMois(java.util.TreeMap<LocalDate, long[]> jours, LocalDate debut, int mois) {
        YearMonth m = YearMonth.from(debut);
        JSONObject p = periode(jours, m.minusMonths(mois).atDay(1), m.atDay(1).minusDays(1));
        /* les taux d'un cumul sont ceux de la moyenne ; les montants sont ramenes a un mois */
        return p.put("mois", mois).put("ttc", p.getLong("ttc") / mois).put("ht", p.getLong("ht") / mois)
                .put("achat", p.getLong("achat") / mois).put("marge", p.getLong("marge") / mois);
    }

    @SuppressWarnings("unchecked")
    private double parametre(String cle, double defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        try {
            return r.isEmpty() || r.get(0) == null ? defaut
                    : Double.parseDouble(String.valueOf(r.get(0)).trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    public JSONObject objectifs() {
        return new JSONObject().put("tauxMarque", parametre(OBJECTIF_MARQUE, 25)).put("tauxMarge",
                parametre(OBJECTIF_MARGE, 33.33));
    }

    /** Enregistre les objectifs (en %) ; rend un message d'erreur, ou null. */
    public String enregistrerObjectifs(double marque, double marge) {
        if (Double.isNaN(marque) || marque <= 0 || marque >= 100) {
            return "L'objectif de taux de marque doit être compris entre 0 et 100 %.";
        }
        if (Double.isNaN(marge) || marge <= 0 || marge > 1000) {
            return "L'objectif de taux de marge doit être compris entre 0 et 1 000 %.";
        }
        ecrire(OBJECTIF_MARQUE, marque, "Objectif du taux de marque (marge / CA HT), en %");
        ecrire(OBJECTIF_MARGE, marge, "Objectif du taux de marge (marge / prix d'achat), en %");
        return null;
    }

    private void ecrire(String cle, double v, String description) {
        String valeur = String.valueOf(Math.round(v * 100) / 100.0);
        int n = em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1, dt_UPDATED = NOW() WHERE str_KEY = ?2")
                .setParameter(1, valeur).setParameter(2, cle).executeUpdate();
        if (n == 0) {
            em.createNativeQuery(
                    "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)"
                            + " VALUES (?1, ?2, ?3, 'NUMBER', 'enable', NOW())")
                    .setParameter(1, cle).setParameter(2, valeur).setParameter(3, description).executeUpdate();
        }
    }

    /**
     * Plan du 19/11 (BFR) : CA HT de la periode, memes ventes et meme calcul que l'Analyse (TTC - remises - TVA), en
     * une requete.
     */
    public long caHt(LocalDate debut, LocalDate fin, String emplacement) {
        List<Object[]> l = lignes("SELECT " + MONTANTS + FROM, debut, fin, emplacement);
        Object[] r = l.isEmpty() || l.get(0) == null ? new Object[4] : l.get(0);
        return indicateurs(n(r[0]), n(r[1]), n(r[2]), n(r[3])).getLong("ht");
    }

    /** Analyse complete (periode, historique, familles, produits) : l'Excel. */
    public JSONObject analyser(LocalDate debut, LocalDate fin, String emplacement) {
        JSONObject o = analyserPeriode(debut, fin, emplacement);
        JSONObject h = historique(debut, fin, emplacement);
        return o.put("moyenne3", h.get("moyenne3")).put("moyenne6", h.get("moyenne6")).put("mois", h.get("mois"))
                .put("historique", true);
    }

    /**
     * Plan du 19/11, point 13 : la periode choisie et sa precedente seules (l'ecran s'affiche sans attendre les six
     * mois : 01/11 -> 19/11 lisait 6 mois et demi de ventes avant le moindre chiffre), avec les familles et les
     * produits qui apportent le plus de marge. L'historique suit par {@link #historique}.
     */
    public JSONObject analyserPeriode(LocalDate debut, LocalDate fin, String emplacement) {
        long duree = java.time.temporal.ChronoUnit.DAYS.between(debut, fin) + 1;
        java.util.TreeMap<LocalDate, long[]> jours = parJour(debut.minusDays(duree), fin, emplacement);
        JSONObject courante = periode(jours, debut, fin);
        JSONObject precedente = periode(jours, debut.minusDays(duree), debut.minusDays(1));
        List<Object[]> produits = parProduit(debut, fin, emplacement);
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("courante", courante).put("precedente", precedente).put("familles", familles(produits, 15))
                .put("produits", produits(produits, PRODUITS_ANALYSE)).put("nombreProduits", produits.size())
                .put("objectifs", objectifs()).put("historique", false);
    }

    /** Plan du 19/11, point 13 : moyennes des 3 et 6 derniers mois et six derniers mois (lu apres la periode). */
    public JSONObject historique(LocalDate debut, LocalDate fin, String emplacement) {
        LocalDate depuis = YearMonth.from(debut).minusMonths(6).atDay(1);
        LocalDate depuisFin = YearMonth.from(fin).minusMonths(5).atDay(1);
        java.util.TreeMap<LocalDate, long[]> jours = parJour(depuis.isBefore(depuisFin) ? depuis : depuisFin, fin,
                emplacement);
        JSONArray parMois = new JSONArray();
        YearMonth dernier = YearMonth.from(fin);
        for (int i = 5; i >= 0; i--) {
            YearMonth m = dernier.minusMonths(i);
            LocalDate f = i == 0 ? fin : m.atEndOfMonth();
            parMois.put(periode(jours, m.atDay(1), f).put("mois", m.toString()).put("partiel",
                    i == 0 && !f.equals(m.atEndOfMonth())));
        }
        return new JSONObject().put("success", true).put("moyenne3", moyenneMois(jours, debut, 3))
                .put("moyenne6", moyenneMois(jours, debut, 6)).put("mois", parMois);
    }

    /** Produits de l'onglet Analyse (les premiers par marge). */
    public static final int PRODUITS_ANALYSE = 20;
    /** « Voir plus » du tableau de bord : au plus tant de produits. */
    public static final int PRODUITS_MAX = 500;

    /**
     * Plan du 19/11, point 13 : produits qui apportent le plus de marge sur la periode (tableau de bord et onglet
     * Analyse : memes regles, memes chiffres). limite <= 0 : jusqu'a {@link #PRODUITS_MAX}.
     */
    public JSONObject topMarges(LocalDate debut, LocalDate fin, String emplacement, int limite) {
        List<Object[]> l = parProduit(debut, fin, emplacement);
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("nombreProduits", l.size()).put("data", produits(l, limite <= 0 ? PRODUITS_MAX : limite));
    }

    /**
     * Montants par produit (cumul par produit d'abord, puis rattachement : sinon le plan part de t_famille, 6 s -> 0,3
     * s) : {id, nom, cip, famille id, famille, quantite, ttc, remise, tva, achat}.
     */
    private List<Object[]> parProduit(LocalDate debut, LocalDate fin, String emplacement) {
        return lignes("SELECT x.lg_FAMILLE_ID, f.str_NAME, f.int_CIP, fa.lg_FAMILLEARTICLE_ID,"
                + " IFNULL(fa.str_LIBELLE, '(sans famille)'), x.qte, x.ttc, x.remise, x.tva, x.achat FROM ("
                + "SELECT d.lg_FAMILLE_ID, SUM(d.int_QUANTITY) qte, SUM(d.int_PRICE) ttc, SUM(IFNULL(d.int_PRICE_REMISE, 0)) remise,"
                + " SUM(IFNULL(d.montantTva, 0)) tva, SUM(IFNULL(d.prixAchat, 0) * d.int_QUANTITY) achat" + FROM
                + " GROUP BY d.lg_FAMILLE_ID) x JOIN t_famille f ON f.lg_FAMILLE_ID = x.lg_FAMILLE_ID"
                + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID", debut, fin,
                emplacement);
    }

    /** Familles (par identifiant de famille d'article) qui degagent le plus de marge, les n premieres. */
    static JSONArray familles(List<Object[]> produits, int n) {
        java.util.TreeMap<String, long[]> parFamille = new java.util.TreeMap<>();
        java.util.Map<String, Object> libelles = new java.util.HashMap<>();
        for (Object[] l : produits) {
            String cle = l[3] == null ? "" : String.valueOf(l[3]);
            long[] t = parFamille.computeIfAbsent(cle, k -> new long[4]);
            for (int i = 0; i < 4; i++) {
                t[i] += n(l[6 + i]);
            }
            libelles.put(cle, l[4]);
        }
        java.util.List<JSONObject> tri = new java.util.ArrayList<>();
        parFamille.forEach((k, t) -> tri.add(indicateurs(t[0], t[1], t[2], t[3]).put("libelle", libelles.get(k))));
        tri.sort((a, b) -> Long.compare(b.getLong("marge"), a.getLong("marge")));
        JSONArray premieres = new JSONArray();
        tri.stream().limit(n).forEach(premieres::put);
        return premieres;
    }

    /** Produits par marge decroissante (a marge egale : par nom), les n premiers. */
    static JSONArray produits(List<Object[]> produits, int n) {
        java.util.List<JSONObject> tri = new java.util.ArrayList<>();
        for (Object[] l : produits) {
            tri.add(indicateurs(n(l[6]), n(l[7]), n(l[8]), n(l[9])).put("id", String.valueOf(l[0]))
                    .put("libelle", l[1] == null ? "" : String.valueOf(l[1]).trim())
                    .put("cip", l[2] == null ? "" : String.valueOf(l[2])).put("famille", l[4])
                    .put("quantite", n(l[5])));
        }
        tri.sort((a, b) -> b.getLong("marge") != a.getLong("marge")
                ? Long.compare(b.getLong("marge"), a.getLong("marge"))
                : a.getString("libelle").compareTo(b.getString("libelle")));
        JSONArray premiers = new JSONArray();
        tri.stream().limit(n).forEach(premiers::put);
        return premiers;
    }
}
