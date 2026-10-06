package rest.service.impl;

import bll.common.Parameter;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.TableauBordService;

/**
 * Nouveau tableau de bord : les formules de {@code bll.report.Dashboard} (memes conditions, memes colonnes de date)
 * rendues parametrables par la date, et les lectures nouvelles du plan (valorisation rayon / reserve, encaissements par
 * mode, alertes, emplacements). Une methode = une carte = une requete (ou deux) : rien n'est lu pour une carte retiree.
 *
 * <p>
 * Remarque sur la marge : l'ancienne requete ecrit {@code CASE WHEN d.int_PRICE_REMISE != NULL}, toujours faux en SQL ;
 * la remise de ligne n'y est donc jamais deduite. Elle est reprise telle quelle pour que la tuile « Marge nette »
 * affiche le meme chiffre que l'ancien tableau de bord, et la marge par produit suit la meme regle pour rester
 * coherente avec elle.
 */
@Stateless
public class TableauBordServiceImpl implements TableauBordService {

    private static final Logger LOG = Logger.getLogger(TableauBordServiceImpl.class.getName());

    /** Conditions de vente de l'ancien tableau de bord (CA du jour, courbe). */
    private static final String VENTE_OK = " p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND p.lg_TYPE_VENTE_ID <> '5' ";

    /** Une rupture « utile » : vendue au moins une fois sur ces derniers jours (le reste est du catalogue dormant). */
    static final int JOURS_RUPTURE_UTILE = 90;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private OrdonnanceRenouvellementService renouvellementService;

    /* ------------------------------------------------------------------ outils */

    private static Timestamp ts(LocalDate d) {
        return Timestamp.valueOf(d.atStartOfDay());
    }

    private static Timestamp ts(LocalDateTime d) {
        return Timestamp.valueOf(d);
    }

    private static long n(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

    private static double d(Object o) {
        return o instanceof Number ? ((Number) o).doubleValue() : 0d;
    }

    private static String t(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, Object... params) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            q.setParameter(i + 1, params[i]);
        }
        List<Object> brut = q.getResultList();
        List<Object[]> out = new ArrayList<>();
        for (Object o : brut) {
            out.add(o instanceof Object[] ? (Object[]) o : new Object[] { o });
        }
        return out;
    }

    private Object[] ligne(String sql, Object... params) {
        List<Object[]> l = lignes(sql, params);
        return l.isEmpty() ? new Object[0] : l.get(0);
    }

    private static Object at(Object[] l, int i) {
        return l.length > i ? l[i] : null;
    }

    /** Fin de la fenetre « du mois » : la fin du jour demande, sans depasser maintenant (comme l'existant). */
    private static LocalDateTime finMois(LocalDate jour) {
        LocalDateTime fin = jour.plusDays(1).atStartOfDay();
        LocalDateTime maintenant = LocalDateTime.now();
        return fin.isAfter(maintenant) ? maintenant : fin;
    }

    /* ------------------------------------------------------------------ tuiles */

    /** CA net (prix - remise) et nombre de ventes d'une journee : getDailyCA_AND_SalesCount. */
    private long[] caJour(LocalDate jour) {
        Object[] r = ligne("SELECT COALESCE(SUM(p.int_PRICE), 0), COALESCE(SUM(p.int_PRICE_REMISE), 0), COUNT(*)"
                + " FROM t_preenregistrement p WHERE" + VENTE_OK + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2",
                ts(jour), ts(jour.plusDays(1)));
        long count = n(at(r, 2));
        return new long[] { count > 0 ? n(at(r, 0)) - n(at(r, 1)) : 0, count };
    }

    @Override
    public JSONObject tuiles(LocalDate jour, boolean achatsDateBl, int joursRupture, String emplacementId) {
        JSONObject o = new JSONObject();
        try {
            long[] ca = caJour(jour);
            long[] ca7 = caJour(jour.minusDays(7));
            o.put("ca", ca[0]).put("clients", ca[1]).put("caJ7", ca7[0]).put("evolutionJ7",
                    ca7[0] == 0 ? JSONObject.NULL : Math.round((ca[0] - ca7[0]) * 1000.0 / ca7[0]) / 10.0);

            /* Marge nette : getCANetAndMargeNet (remise de ligne non deduite, voir l'en-tete de la classe). */
            Object[] m = ligne(
                    "SELECT (ROUND(SUM((d.int_PRICE - 0) / (1 + (v.int_VALUE / 100)))) - SUM(f.int_PAF * d.int_QUANTITY)),"
                            + " SUM((d.int_PRICE - 0) / (1 + (v.int_VALUE / 100))), COUNT(p.lg_PREENREGISTREMENT_ID)"
                            + " FROM t_preenregistrement_detail d, t_preenregistrement p, t_famille f, t_famillearticle fa, t_code_tva v"
                            + " WHERE p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID AND f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                            + " AND fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID AND v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID AND"
                            + VENTE_OK + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2",
                    ts(jour), ts(jour.plusDays(1)));
            long marge = n(at(m, 2)) > 0 ? n(at(m, 0)) : 0;
            double ht = d(at(m, 1));
            o.put("marge", marge).put("tauxMarge", ht > 0 ? Math.round(marge * 1000.0 / ht) / 10.0 : 0);

            /* Panier moyen : getPanierMoyen. */
            Object[] pm = ligne("SELECT COUNT(IF((o.str_TYPE_VENTE = 'VNO' AND o.lg_NATURE_VENTE_ID <> '3'), 1, NULL)),"
                    + " COUNT(IF((o.str_TYPE_VENTE = 'VO' AND o.lg_NATURE_VENTE_ID <> '3'), 1, NULL)),"
                    + " SUM(CASE WHEN (o.str_TYPE_VENTE = 'VNO' AND o.lg_NATURE_VENTE_ID <> '3') THEN (o.int_PRICE - o.int_PRICE_REMISE) ELSE 0 END),"
                    + " SUM(CASE WHEN (o.str_TYPE_VENTE = 'VO' AND o.lg_NATURE_VENTE_ID <> '3') THEN (o.int_PRICE - (o.int_CUST_PART - o.int_PRICE_REMISE)) ELSE 0 END),"
                    + " SUM(CASE WHEN o.str_TYPE_VENTE = 'VO' THEN (o.int_CUST_PART - o.int_PRICE_REMISE) ELSE 0 END)"
                    + " FROM t_preenregistrement o WHERE o.int_PRICE > 0 AND o.str_STATUT = 'is_Closed'"
                    + " AND o.dt_UPDATED >= ?1 AND o.dt_UPDATED < ?2 AND o.b_IS_CANCEL = 0", ts(jour),
                    ts(jour.plusDays(1)));
            double nb = d(at(pm, 0)) + d(at(pm, 1));
            double montant = d(at(pm, 3)) + d(at(pm, 2)) + d(at(pm, 4));
            o.put("panier", nb > 0 ? Math.round(montant / nb) : 0);

            /* Achats : getAchatAmount (TTC a la date de saisie) ; HT et TVA en plus ; option date du BL. */
            String colonne = achatsDateBl ? "b.dt_DATE_LIVRAISON" : "b.dt_UPDATED";
            Object[] a = ligne(
                    "SELECT COALESCE(SUM(b.int_MHT), 0), COALESCE(SUM(b.int_TVA), 0), COALESCE(SUM(b.int_HTTC), 0),"
                            + " COUNT(*) FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed' AND " + colonne
                            + " >= ?1 AND " + colonne + " < ?2",
                    ts(jour), ts(jour.plusDays(1)));
            o.put("achats", new JSONObject().put("ht", n(at(a, 0))).put("tva", n(at(a, 1))).put("ttc", n(at(a, 2)))
                    .put("bl", n(at(a, 3))).put("mode", achatsDateBl ? "bl" : "saisie"));

            o.put("ruptures", ruptures(joursRupture, emplacementId));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : tuiles", e);
            o.put("erreur", true);
        }
        return o;
    }

    /**
     * Produits en rupture « utile » : stock <= 0 a l'emplacement, actifs, vendus (vente cloturee) sur les
     * JOURS_RUPTURE_UTILE derniers jours, avec la date de leur derniere vente. Un seul agregat sur les ventes recentes
     * (index de date) plutot qu'une recherche par produit : 0,4 s au lieu de 5 s sur la base de test.
     */
    private static final String RUPTURES = "SELECT f.str_NAME AS nom, f.int_CIP AS cip, x.derniere AS derniere,"
            + " (SELECT g.str_LIBELLE FROM t_grossiste g WHERE g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID) AS grossiste"
            + " FROM (SELECT d.lg_FAMILLE_ID AS famille, MAX(p.dt_UPDATED) AS derniere FROM t_preenregistrement p"
            + "   JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + "   WHERE p.dt_UPDATED >= ?2 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + "   GROUP BY d.lg_FAMILLE_ID) x"
            + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = x.famille AND s.lg_EMPLACEMENT_ID = ?1 AND s.int_NUMBER_AVAILABLE <= 0"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = x.famille AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0";

    private JSONObject ruptures(int jours, String emplacementId) {
        Object[] r = ligne(
                "SELECT COUNT(*), COALESCE(SUM(CASE WHEN r.derniere >= ?3 THEN 1 ELSE 0 END), 0) FROM (" + RUPTURES
                        + ") r",
                emplacementId, ts(LocalDate.now().minusDays(JOURS_RUPTURE_UTILE)),
                ts(LocalDate.now().minusDays(Math.max(1, jours))));
        return new JSONObject().put("produits", n(at(r, 0))).put("vendusRecemment", n(at(r, 1))).put("jours", jours)
                .put("fenetre", JOURS_RUPTURE_UTILE);
    }

    /* ------------------------------------------------------------------ courbe */

    @Override
    public JSONObject evolution(int annee) {
        JSONObject o = new JSONObject().put("annee", annee);
        try {
            /*
             * getCaGrapheData, sur deux annees : la demandee et la precedente (comparaison N-1). Les ventes ANNULEES
             * sont ecartees, comme pour la tuile du CA et le pilotage (l'ancienne courbe les comptait, ce qui gonflait
             * le mois d'une annulation).
             */
            List<Object[]> l = lignes(
                    "SELECT YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED), SUM(p.int_PRICE - p.int_PRICE_REMISE)"
                            + " FROM t_preenregistrement p WHERE" + VENTE_OK
                            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2"
                            + " GROUP BY YEAR(p.dt_UPDATED), MONTH(p.dt_UPDATED)",
                    ts(LocalDate.of(annee - 1, 1, 1)), ts(LocalDate.of(annee + 1, 1, 1)));
            long[] n0 = new long[12], n1 = new long[12];
            for (Object[] r : l) {
                int y = (int) n(r[0]);
                int mo = (int) n(r[1]) - 1;
                if (mo >= 0 && mo < 12) {
                    (y == annee ? n0 : n1)[mo] = n(r[2]);
                }
            }
            JSONArray a0 = new JSONArray(), a1 = new JSONArray();
            for (int i = 0; i < 12; i++) {
                a0.put(n0[i]);
                a1.put(n1[i]);
            }
            o.put("mois", a0).put("precedente", a1);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : evolution", e);
            o.put("erreur", true);
        }
        return o;
    }

    /* ------------------------------------------------------------------ valorisation */

    @Override
    public JSONObject valorisation(String emplacementId) {
        JSONObject o = new JSONObject();
        try {
            Object[] r = ligne("SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0),"
                    + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE), 0) FROM t_famille_stock s"
                    + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID = ?1"
                    + " AND f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0", emplacementId);
            /* Reserve : meme source que la fiche article (t_type_stock_famille, type 2). */
            Object[] v = ligne(
                    "SELECT COALESCE(SUM(t.int_NUMBER * f.int_PAF), 0), COALESCE(SUM(t.int_NUMBER * f.int_PRICE), 0)"
                            + " FROM t_type_stock_famille t JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID"
                            + " WHERE t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = ?1 AND f.str_STATUT = 'enable'"
                            + " AND t.int_NUMBER > 0",
                    emplacementId);
            long ra = n(at(r, 0)), rv = n(at(r, 1)), sa = n(at(v, 0)), sv = n(at(v, 1));
            o.put("rayon", new JSONObject().put("achat", ra).put("vente", rv))
                    .put("reserve", new JSONObject().put("achat", sa).put("vente", sv))
                    .put("total", new JSONObject().put("achat", ra + sa).put("vente", rv + sv));
            o.put("dormants", dormants(emplacementId));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : valorisation", e);
            o.put("erreur", true);
        }
        return o;
    }

    /**
     * Produits en stock dont la derniere entree (fiche produit, dt_DATE_LAST_ENTREE) date de plus d'un mois et qui
     * n'ont pas ete vendus depuis ; « vendus » : ceux qui ont eu au moins une vente depuis leur entree.
     */
    private JSONObject dormants(String emplacementId) {
        Object[] r = ligne("SELECT COALESCE(SUM(CASE WHEN x.v = 0 THEN 1 ELSE 0 END), 0),"
                + " COALESCE(SUM(CASE WHEN x.v = 0 THEN x.valeur ELSE 0 END), 0), COALESCE(SUM(x.v), 0) FROM ("
                + " SELECT s.int_NUMBER_AVAILABLE * f.int_PAF AS valeur, EXISTS (SELECT 1 FROM t_preenregistrement_detail d"
                + "   WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND d.dt_CREATED >= f.dt_DATE_LAST_ENTREE) AS v"
                + " FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
                + " WHERE s.lg_EMPLACEMENT_ID = ?1 AND s.int_NUMBER_AVAILABLE > 0 AND f.str_STATUT = 'enable'"
                + " AND f.dt_DATE_LAST_ENTREE < ?2) x", emplacementId, ts(LocalDate.now().minusMonths(1)));
        return new JSONObject().put("produits", n(at(r, 0))).put("valeurAchat", n(at(r, 1))).put("vendus", n(at(r, 2)));
    }

    /* ------------------------------------------------------------------ encaissements */

    @Override
    public JSONObject encaissements(LocalDate jour, String modesMobileMoney) {
        JSONObject o = new JSONObject();
        try {
            List<String> mm = new ArrayList<>();
            for (String x : StringUtils.defaultString(modesMobileMoney).split(",")) {
                if (StringUtils.isNotBlank(x)) {
                    mm.add(x.trim());
                }
            }
            /* Meme source que la balance et le ticket Z : vente_reglement, par type de reglement. */
            List<Object[]> l = lignes(
                    "SELECT r.lg_TYPE_REGLEMENT_ID, r.str_NAME, SUM(vr.montant) FROM vente_reglement vr"
                            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id"
                            + " JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement WHERE" + VENTE_OK
                            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 GROUP BY r.lg_TYPE_REGLEMENT_ID, r.str_NAME"
                            + " ORDER BY SUM(vr.montant) DESC",
                    ts(jour), ts(jour.plusDays(1)));
            JSONArray modes = new JSONArray();
            JSONArray operateurs = new JSONArray();
            long totalMm = 0;
            for (Object[] r : l) {
                long montant = n(r[2]);
                if (montant == 0) {
                    continue;
                }
                if (mm.contains(t(r[0]))) {
                    operateurs.put(new JSONObject().put("id", t(r[0])).put("libelle", t(r[1])).put("montant", montant));
                    totalMm += montant;
                } else {
                    modes.put(new JSONObject().put("id", t(r[0])).put("libelle", t(r[1])).put("montant", montant));
                }
            }
            if (totalMm > 0) {
                modes.put(new JSONObject().put("id", "MM").put("libelle", "Mobile money").put("montant", totalMm)
                        .put("operateurs", operateurs));
            }
            /* Credit tiers payant : la part que le client ne paie pas au comptoir (definition du pilotage). */
            Object[] tp = ligne(
                    "SELECT COALESCE(SUM(CASE WHEN p.str_TYPE_VENTE = 'VO' THEN (p.int_PRICE - COALESCE(p.int_CUST_PART, 0))"
                            + " ELSE 0 END), 0) FROM t_preenregistrement p WHERE" + VENTE_OK
                            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2",
                    ts(jour), ts(jour.plusDays(1)));
            if (n(at(tp, 0)) > 0) {
                modes.put(new JSONObject().put("id", "TP").put("libelle", "Tiers payants (crédit)").put("montant",
                        n(at(tp, 0))));
            }
            o.put("modes", modes);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : encaissements", e);
            o.put("erreur", true);
        }
        return o;
    }

    /* ------------------------------------------------------------------ mouvements de caisse */

    @Override
    public JSONObject mouvements(LocalDate jour) {
        JSONObject o = new JSONObject();
        try {
            /* getListMVT : hors ventes VO / VNO ; categorie 0 vente, 1 entree, 2 sortie, 3 achat. */
            List<Object[]> l = lignes(
                    "SELECT t.str_NAME, SUM(m.int_AMOUNT), t.categorie FROM t_mvt_caisse m, t_type_mvt_caisse t"
                            + " WHERE t.lg_TYPE_MVT_CAISSE_ID = m.lg_TYPE_MVT_CAISSE_ID AND t.lg_TYPE_MVT_CAISSE_ID <> ?3"
                            + " AND t.lg_TYPE_MVT_CAISSE_ID <> ?4 AND m.dt_CREATED >= ?1 AND m.dt_CREATED < ?2"
                            + " GROUP BY t.str_NAME, t.categorie",
                    ts(jour), ts(jour.plusDays(1)), Parameter.TYPE_MV_CAISSE_VNO, Parameter.TYPE_MV_CAISSE_VO);
            JSONArray a = new JSONArray();
            long solde = 0;
            for (Object[] r : l) {
                int cat = (int) n(r[2]);
                long montant = Math.round(d(r[1]));
                boolean sortie = cat == 2 || cat == 3 || montant < 0;
                long signe = sortie ? -Math.abs(montant) : Math.abs(montant);
                solde += signe;
                a.put(new JSONObject().put("libelle", t(r[0])).put("montant", signe).put("categorie", cat).put("sortie",
                        sortie));
            }
            o.put("data", a).put("solde", solde);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : mouvements", e);
            o.put("erreur", true);
        }
        return o;
    }

    /* ------------------------------------------------------------------ alertes */

    private static final String PEREMPTIONS_FROM = " FROM t_lot l JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID"
            + " WHERE l.str_STATUT = 'enable' AND l.dt_PEREMPTION IS NOT NULL AND IFNULL(l.current_stock, l.int_NUMBER) > 0"
            + " AND DATE(l.dt_PEREMPTION) >= CURDATE() AND DATE(l.dt_PEREMPTION) < DATE_ADD(CURDATE(), INTERVAL ?1 MONTH)";

    @Override
    public JSONObject alertes(int moisPeremption, int joursRupture, int joursRenouvellement, int joursSuggestion,
            String emplacementId) {
        JSONObject o = new JSONObject();
        try {
            o.put("ruptures", ruptures(joursRupture, emplacementId));
            /* Meme lecture que la cloche et le pilotage (peremptionsProches), periode reglable. */
            Object[] p = ligne(
                    "SELECT COUNT(DISTINCT l.lg_FAMILLE_ID), COUNT(*), COALESCE(SUM(IFNULL(l.current_stock, l.int_NUMBER) * f.int_PAF), 0)"
                            + PEREMPTIONS_FROM,
                    Math.max(1, moisPeremption));
            o.put("peremptions", new JSONObject().put("produits", n(at(p, 0))).put("lots", n(at(p, 1)))
                    .put("valeurAchat", n(at(p, 2))).put("mois", moisPeremption));
            Object[] s = ligne("SELECT COALESCE(SUM(CASE WHEN str_CATEGORIE = 'RESERVE' THEN 1 ELSE 0 END), 0),"
                    + " COALESCE(SUM(CASE WHEN str_CATEGORIE = 'RAYON' THEN 1 ELSE 0 END), 0) FROM t_suggestion_reserve"
                    + " WHERE str_STATUT IN ('A_TRAITER', 'EN_COURS') AND lg_EMPLACEMENT_ID = ?1", emplacementId);
            o.put("suggestionsReserve", n(at(s, 0))).put("suggestionsRayon", n(at(s, 1)));
            Object[] c = ligne(
                    "SELECT COUNT(*) FROM t_suggestion_order WHERE str_STATUT = 'cloturee' AND dt_CLOTURE IS NOT NULL"
                            + " AND dt_CLOTURE <= ?1",
                    ts(LocalDateTime.now().minusDays(Math.max(0, joursSuggestion))));
            o.put("suggestionsCommande", new JSONObject().put("cloturees", n(at(c, 0))).put("jours", joursSuggestion));
            int renouv;
            try {
                renouv = renouvellementService.aRenouvelerSous(joursRenouvellement);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "tableau de bord : renouvellements", e);
                renouv = 0;
            }
            o.put("renouvellements", new JSONObject().put("patients", renouv).put("jours", joursRenouvellement));
            Object[] av = ligne(
                    "SELECT COUNT(*) FROM t_preenregistrement p WHERE p.b_IS_AVOIR = 1 AND p.str_STATUT = 'is_Closed'"
                            + " AND p.b_IS_CANCEL = 0 AND p.dt_CLOTURE_AVOIR IS NULL");
            o.put("avoirs", n(at(av, 0)));
            /* Retours du 06/10 : articles en stock negatif a l'emplacement (actifs). */
            Object[] ng = ligne(
                    "SELECT COUNT(*) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
                            + " WHERE s.lg_EMPLACEMENT_ID = ?1 AND s.int_NUMBER_AVAILABLE < 0 AND f.str_STATUT = 'enable'",
                    emplacementId);
            o.put("negatifs", n(at(ng, 0)));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : alertes", e);
            o.put("erreur", true);
        }
        return o;
    }

    @Override
    public JSONObject alerteListe(String type, int moisPeremption, int joursRupture, String emplacementId, int limite) {
        JSONObject o = new JSONObject().put("type", type);
        JSONArray a = new JSONArray();
        int max = limite <= 0 ? 500 : limite;
        try {
            if ("ruptures".equals(type)) {
                for (Object[] r : lignes("SELECT * FROM (" + RUPTURES + ") r ORDER BY r.derniere DESC LIMIT " + max,
                        emplacementId, ts(LocalDate.now().minusDays(JOURS_RUPTURE_UTILE)))) {
                    Timestamp dv = (Timestamp) r[2];
                    a.put(new JSONObject().put("libelle", t(r[0])).put("cip", t(r[1]))
                            .put("derniereVente", dv == null ? "" : dv.toLocalDateTime().toLocalDate().toString())
                            .put("recent",
                                    dv != null && !dv.toLocalDateTime().toLocalDate()
                                            .isBefore(LocalDate.now().minusDays(Math.max(1, joursRupture))))
                            .put("grossiste", t(r[3])));
                }
            } else if ("peremptions".equals(type)) {
                for (Object[] r : lignes(
                        "SELECT f.str_NAME, f.int_CIP, l.int_NUM_LOT, DATE(l.dt_PEREMPTION), IFNULL(l.current_stock, l.int_NUMBER)"
                                + PEREMPTIONS_FROM + " ORDER BY l.dt_PEREMPTION ASC LIMIT " + max,
                        Math.max(1, moisPeremption))) {
                    a.put(new JSONObject().put("libelle", t(r[0])).put("cip", t(r[1])).put("lot", t(r[2]))
                            .put("peremption", t(r[3])).put("quantite", n(r[4])));
                }
            } else if ("negatifs".equals(type)) {
                for (Object[] r : lignes(
                        "SELECT f.str_NAME, f.int_CIP, s.int_NUMBER_AVAILABLE, z.str_LIBELLEE FROM t_famille_stock s"
                                + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                                + " WHERE s.lg_EMPLACEMENT_ID = ?1 AND s.int_NUMBER_AVAILABLE < 0 AND f.str_STATUT = 'enable'"
                                + " ORDER BY s.int_NUMBER_AVAILABLE ASC LIMIT " + max,
                        emplacementId)) {
                    a.put(new JSONObject().put("libelle", t(r[0])).put("cip", t(r[1])).put("quantite", n(r[2]))
                            .put("emplacement", t(r[3])));
                }
            } else if ("rayon".equals(type)) {
                for (Object[] r : lignes(
                        "SELECT f.str_NAME, f.int_CIP, COALESCE(d.int_QTE_RETENUE, d.int_QTE_PROPOSEE), s.str_REF FROM t_suggestion_reserve s"
                                + " JOIN t_suggestion_reserve_detail d ON d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID"
                                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE s.str_CATEGORIE = 'RAYON'"
                                + " AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS') AND s.lg_EMPLACEMENT_ID = ?1"
                                + " ORDER BY f.str_NAME LIMIT " + max,
                        emplacementId)) {
                    a.put(new JSONObject().put("libelle", t(r[0])).put("cip", t(r[1])).put("quantite", n(r[2]))
                            .put("reference", t(r[3])));
                }
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : liste d'alerte " + type, e);
            o.put("erreur", true);
        }
        return o.put("data", a);
    }

    /* ------------------------------------------------------------------ tops */

    @Override
    public JSONObject topMois(LocalDate jour, int limite) {
        JSONObject o = new JSONObject();
        try {
            int max = limite <= 0 ? 1000 : limite;
            List<Object[]> l = lignes(
                    "SELECT f.lg_FAMILLE_ID, f.str_NAME, f.int_CIP, SUM(d.int_QUANTITY), SUM(d.int_PRICE),"
                            + " SUM(d.int_PRICE / (1 + (v.int_VALUE / 100))) - SUM(f.int_PAF * d.int_QUANTITY),"
                            + " SUM(d.int_PRICE / (1 + (v.int_VALUE / 100)))"
                            + " FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID"
                            + " WHERE" + VENTE_OK + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2"
                            + " GROUP BY f.lg_FAMILLE_ID, f.str_NAME, f.int_CIP ORDER BY SUM(d.int_PRICE) DESC LIMIT "
                            + max,
                    ts(jour.withDayOfMonth(1)), ts(finMois(jour)));
            JSONArray a = new JSONArray();
            for (Object[] r : l) {
                double ht = d(r[6]);
                long marge = Math.round(d(r[5]));
                a.put(new JSONObject().put("id", t(r[0])).put("libelle", t(r[1])).put("cip", t(r[2]))
                        .put("quantite", n(r[3])).put("ca", n(r[4])).put("marge", marge)
                        .put("taux", ht > 0 ? Math.round(marge * 1000.0 / ht) / 10.0 : 0));
            }
            o.put("data", a);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : top du mois", e);
            o.put("erreur", true);
        }
        return o;
    }

    @Override
    public JSONObject topJour(LocalDate jour, int limite) {
        JSONObject o = new JSONObject();
        try {
            int max = limite <= 0 ? 1000 : limite;
            /* getTOP5ArticleVendueCA / QTY : date de creation, groupement par libelle. */
            String base = "SELECT f.str_NAME, SUM(d.int_QUANTITY), SUM(d.int_PRICE), MAX(f.int_CIP) FROM t_preenregistrement_detail d,"
                    + " t_preenregistrement p, t_famille f WHERE p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                    + " AND f.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
                    + " AND p.dt_CREATED >= ?1 AND p.dt_CREATED < ?2 AND p.lg_TYPE_VENTE_ID <> '5' GROUP BY f.str_NAME";
            JSONArray ca = new JSONArray(), qte = new JSONArray();
            for (Object[] r : lignes(base + " ORDER BY SUM(d.int_PRICE) DESC LIMIT " + max, ts(jour),
                    ts(jour.plusDays(1)))) {
                ca.put(new JSONObject().put("libelle", t(r[0])).put("quantite", n(r[1])).put("valeur", n(r[2]))
                        .put("cip", t(r[3])));
            }
            for (Object[] r : lignes(base + " ORDER BY SUM(d.int_QUANTITY) DESC LIMIT " + max, ts(jour),
                    ts(jour.plusDays(1)))) {
                qte.put(new JSONObject().put("libelle", t(r[0])).put("valeur", n(r[1])).put("ca", n(r[2])).put("cip",
                        t(r[3])));
            }
            o.put("ca", ca).put("quantites", qte);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : tops du jour", e);
            o.put("erreur", true);
        }
        return o;
    }

    /* ------------------------------------------------------------------ grossistes, emplacements, tiers payants */

    private JSONObject liste(String sql, String quoi, Object... params) {
        JSONObject o = new JSONObject();
        try {
            JSONArray a = new JSONArray();
            for (Object[] r : lignes(sql, params)) {
                a.put(new JSONObject().put("libelle", t(r[0])).put("valeur", n(r[1])));
            }
            o.put("data", a);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : " + quoi, e);
            o.put("erreur", true);
        }
        return o;
    }

    @Override
    public JSONObject grossistes(LocalDate jour, int limite) {
        /* getAllAchatByGrossiste : HT des BL clotures du mois, a la date de saisie. */
        return liste("SELECT g.str_LIBELLE, SUM(b.int_MHT) FROM t_bon_livraison b, t_order o, t_grossiste g"
                + " WHERE o.lg_ORDER_ID = b.lg_ORDER_ID AND o.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID AND b.dt_UPDATED >= ?1"
                + " AND b.dt_UPDATED <= ?2 AND b.str_STATUT = 'is_Closed' GROUP BY g.lg_GROSSISTE_ID, g.str_LIBELLE"
                + " ORDER BY SUM(b.int_MHT) DESC" + (limite > 0 ? " LIMIT " + limite : ""), "grossistes",
                ts(jour.withDayOfMonth(1)), ts(finMois(jour)));
    }

    @Override
    public JSONObject emplacements(LocalDate jour, int limite) {
        return liste(
                "SELECT COALESCE(z.str_LIBELLEE, 'Sans emplacement'), SUM(d.int_PRICE) FROM t_preenregistrement_detail d"
                        + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                        + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                        + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID WHERE" + VENTE_OK
                        + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 GROUP BY z.lg_ZONE_GEO_ID, z.str_LIBELLEE"
                        + " ORDER BY SUM(d.int_PRICE) DESC" + (limite > 0 ? " LIMIT " + limite : ""),
                "emplacements", ts(jour.withDayOfMonth(1)), ts(finMois(jour)));
    }

    @Override
    public JSONObject tiersPayants(LocalDate jour, int limite) {
        /* getBestClients : parts tiers payant non facturees des ventes du mois, par organisme. */
        return liste("SELECT tp.str_FULLNAME, SUM(c.int_PRICE) FROM t_tiers_payant tp"
                + " JOIN t_compte_client_tiers_payant cc ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID"
                + " JOIN t_preenregistrement_compte_client_tiers_payent c ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " JOIN t_preenregistrement p ON c.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                + " WHERE p.str_STATUT = 'is_Closed' AND c.str_STATUT_FACTURE = 'unpaid' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
                + " AND p.dt_CREATED >= ?1 AND p.dt_CREATED <= ?2 GROUP BY tp.str_FULLNAME ORDER BY SUM(c.int_PRICE) DESC"
                + (limite > 0 ? " LIMIT " + limite : ""), "tiers payants", ts(jour.withDayOfMonth(1)),
                ts(finMois(jour)));
    }

    /**
     * Frequentation (retours du 06/10) : ventes par tranche de deux heures, semaine precedente (lundi a dimanche) et
     * semaine en cours (lundi au jour demande), avec le nombre de jours ouvres (jours ayant au moins une vente) de
     * chacune pour comparer des moyennes par jour.
     */
    @Override
    public JSONObject frequentation(LocalDate jour) {
        JSONObject o = new JSONObject();
        try {
            LocalDate lundi = jour.minusDays(jour.getDayOfWeek().getValue() - 1L);
            LocalDate lundiPrec = lundi.minusDays(7);
            o.put("semaine",
                    semaine(lundi, jour.plusDays(1)).put("debut", lundi.toString()).put("fin", jour.toString()));
            o.put("precedente", semaine(lundiPrec, lundi).put("debut", lundiPrec.toString()).put("fin",
                    lundi.minusDays(1).toString()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tableau de bord : frequentation", e);
            o.put("erreur", true);
        }
        return o;
    }

    private JSONObject semaine(LocalDate debut, LocalDate finExclue) {
        long[] ventes = new long[12], ca = new long[12];
        for (Object[] r : lignes(
                "SELECT FLOOR(HOUR(p.dt_UPDATED) / 2), COUNT(*), SUM(p.int_PRICE - p.int_PRICE_REMISE)"
                        + " FROM t_preenregistrement p WHERE" + VENTE_OK
                        + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2" + " GROUP BY FLOOR(HOUR(p.dt_UPDATED) / 2)",
                ts(debut), ts(finExclue))) {
            int i = (int) n(r[0]);
            if (i >= 0 && i < 12) {
                ventes[i] = n(r[1]);
                ca[i] = n(r[2]);
            }
        }
        Object[] j = ligne("SELECT COUNT(DISTINCT DATE(p.dt_UPDATED)) FROM t_preenregistrement p WHERE" + VENTE_OK
                + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2", ts(debut), ts(finExclue));
        JSONArray v = new JSONArray(), c = new JSONArray();
        for (int i = 0; i < 12; i++) {
            v.put(ventes[i]);
            c.put(ca[i]);
        }
        return new JSONObject().put("ventes", v).put("ca", c).put("jours", n(at(j, 0)));
    }

    @Override
    public String parametre(String cle, String defaut) {
        try {
            Object[] r = ligne("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1", cle);
            String v = t(at(r, 0));
            return v.isEmpty() ? defaut : v;
        } catch (Exception e) {
            return defaut;
        }
    }
}
