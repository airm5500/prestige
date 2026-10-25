package rest.service.impl.audit;

import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CaisseService;
import util.Constant;

/**
 * AUDIT & RAPPROCHEMENTS (besoins du 11/10, point 6) - onglet Analyse. LECTURE SEULE : aucune ecriture en base, aucun
 * evenement ni ticket de support cree. Chaque section compare deux sources qui devraient concorder et rend les ecarts :
 * <ul>
 * <li>stock : stock reel / derniere ligne de l'historique des mouvements ; stocks negatifs ;</li>
 * <li>caisses : caisses restees ouvertes depuis un jour precedent ; ecarts de billetage de la periode (meme calcul que
 * l'analyse des ecarts de caisse) ;</li>
 * <li>differes : reste du enregistre sur les ventes / releve (ventes differees - reglements), par client ;</li>
 * <li>carnets depot : solde du carnet / ventes - reglements - retours, par depot ;</li>
 * <li>controles de coherence du centre de support, rejoues en simple comptage.</li>
 * </ul>
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED) // lecture seule : une section en erreur ne condamne pas
                                                              // les suivantes
public class AuditAnalyseService {

    private static final Logger LOG = Logger.getLogger(AuditAnalyseService.class.getName());
    /** Lignes rendues par section au plus (le nombre total d'ecarts reste exact). */
    static final int MAX_LIGNES = 500;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private CaisseService caisseService;

    public JSONObject analyser(LocalDate debut, LocalDate fin, TUser utilisateur) {
        JSONArray sections = new JSONArray();
        sections.put(securiser("STOCK", "Stock / historique des mouvements", this::stock));
        sections.put(securiser("STOCK_NEGATIF", "Stocks négatifs", this::stocksNegatifs));
        sections.put(securiser("CAISSES_OUVERTES", "Caisses restées ouvertes", this::caissesOuvertes));
        sections.put(securiser("BILLETAGE", "Écarts de billetage", () -> billetage(debut, fin, utilisateur)));
        sections.put(securiser("DIFFERES", "Soldes des différés", this::differes));
        sections.put(securiser("CARNETS", "Soldes des carnets dépôt", this::carnets));
        sections.put(securiser("CONTROLES", "Contrôles de cohérence", this::controles));
        int alertes = 0;
        for (int i = 0; i < sections.length(); i++) {
            if (sections.getJSONObject(i).optInt("nb") > 0) {
                alertes++;
            }
        }
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("sections", sections).put("sectionsEnEcart", alertes);
    }

    @FunctionalInterface
    interface Calcul {
        JSONObject calculer();
    }

    /** Une section en erreur n'empeche pas les autres : elle est rendue avec son message. */
    private static JSONObject securiser(String code, String titre, Calcul calcul) {
        try {
            return calcul.calculer().put("code", code).put("titre", titre);
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Audit, section " + code, e);
            return new JSONObject().put("code", code).put("titre", titre).put("nb", 0)
                    .put("erreur", "Section non calculée : " + String.valueOf(e.getMessage()))
                    .put("lignes", new JSONArray());
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, Object... params) {
        javax.persistence.Query q = em.createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            q.setParameter(i + 1, params[i]);
        }
        return q.getResultList();
    }

    private static long nombre(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    private static final java.time.format.DateTimeFormatter JJ_HH = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy HH:mm");

    private static String dateHeure(Object o) {
        if (o instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) o).toLocalDateTime().format(JJ_HH);
        }
        if (o instanceof java.time.LocalDateTime) {
            return ((java.time.LocalDateTime) o).format(JJ_HH);
        }
        return texte(o);
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    /* ------------------------------------------------------------------ stock */

    /**
     * Stock reel different du stock apres le dernier mouvement du produit dans l'emplacement. Plusieurs lignes peuvent
     * partager la derniere seconde (vente et deconditionnement automatique) : le stock est juste s'il vaut le stock
     * apres de l'une d'elles.
     *
     * <p>
     * Les reassorts reserve -> rayon (et l'inverse) changent le stock rayon sans ligne dans hmvtproduit : ils sont dans
     * t_mouvement_reserve, avec le stock rayon apres. Le dernier mouvement est donc le plus recent des deux journaux ;
     * a la meme seconde, l'un ou l'autre stock apres suffit.
     */
    private JSONObject stock() {
        String reserveDernier = "SELECT 1 FROM t_mouvement_reserve r WHERE r.lg_FAMILLE_ID = m.f AND r.lg_EMPLACEMENT_ID = m.e"
                + "   AND r.dt_CREATED = m.rmax";
        String historiqueDernier = "SELECT 1 FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = m.f AND h.lg_EMPLACEMENT_ID = m.e"
                + "   AND h.createdAt = m.dmax";
        List<Object[]> r = lignes(
                "SELECT f.lg_FAMILLE_ID id, f.int_CIP cip, f.str_NAME produit, e.str_NAME emplacement,"
                        + " s.int_NUMBER_AVAILABLE reel, CASE WHEN m.rmax > m.dmax"
                        + "   THEN (SELECT r.int_STOCK_RAYON_APRES FROM t_mouvement_reserve r WHERE r.lg_FAMILLE_ID = m.f"
                        + "     AND r.lg_EMPLACEMENT_ID = m.e AND r.dt_CREATED = m.rmax ORDER BY r.lg_MOUVEMENT_ID DESC LIMIT 1)"
                        + "   ELSE (SELECT h.qteFinale FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = m.f AND h.lg_EMPLACEMENT_ID = m.e"
                        + "     AND h.createdAt = m.dmax ORDER BY h.typeMvt = '05' LIMIT 1) END historique,"
                        + " GREATEST(m.dmax, COALESCE(m.rmax, m.dmax)) dernier"
                        + " FROM (SELECT d.f, d.e, d.dmax, (SELECT MAX(r.dt_CREATED) FROM t_mouvement_reserve r"
                        + "         WHERE r.lg_FAMILLE_ID = d.f AND r.lg_EMPLACEMENT_ID = d.e) rmax"
                        + "       FROM (SELECT lg_FAMILLE_ID f, lg_EMPLACEMENT_ID e, MAX(createdAt) dmax FROM hmvtproduit"
                        + "             GROUP BY lg_FAMILLE_ID, lg_EMPLACEMENT_ID) d) m"
                        + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = m.f AND s.lg_EMPLACEMENT_ID = m.e"
                        + " JOIN t_famille f ON f.lg_FAMILLE_ID = m.f JOIN t_emplacement e ON e.lg_EMPLACEMENT_ID = m.e"
                        + " WHERE f.str_STATUT = 'enable' AND NOT ((m.rmax IS NULL OR m.rmax <= m.dmax)"
                        + "     AND EXISTS (" + historiqueDernier + " AND h.qteFinale = s.int_NUMBER_AVAILABLE))"
                        + "   AND NOT (m.rmax >= m.dmax AND EXISTS (" + reserveDernier
                        + " AND r.int_STOCK_RAYON_APRES = s.int_NUMBER_AVAILABLE))"
                        + " ORDER BY m.e <> '1', e.str_NAME, f.str_NAME");
        JSONArray l = new JSONArray();
        long totalEcart = 0;
        for (Object[] o : r) {
            long reel = nombre(o[4]), historique = nombre(o[5]);
            totalEcart += Math.abs(reel - historique);
            if (l.length() < MAX_LIGNES) {
                l.put(new JSONObject().put("produitId", texte(o[0])).put("cip", texte(o[1])).put("libelle", texte(o[2]))
                        .put("emplacement", texte(o[3])).put("stockReel", reel).put("stockHistorique", historique)
                        .put("ecart", reel - historique).put("dernierMouvement", dateHeure(o[6])));
            }
        }
        return new JSONObject().put("nb", r.size()).put("quantite", totalEcart).put("lignes", l).put("explication",
                "Le stock réel du produit ne correspond pas au stock après son dernier mouvement enregistré "
                        + "(réassorts de la réserve compris) : un mouvement n'a pas été historisé, ou le stock a été "
                        + "modifié hors des écrans prévus.");
    }

    private JSONObject stocksNegatifs() {
        List<Object[]> r = lignes(
                "SELECT f.lg_FAMILLE_ID id, f.int_CIP cip, f.str_NAME produit, e.str_NAME emplacement,"
                        + " s.int_NUMBER_AVAILABLE reel FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
                        + " JOIN t_emplacement e ON e.lg_EMPLACEMENT_ID = s.lg_EMPLACEMENT_ID"
                        + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE < 0 ORDER BY s.int_NUMBER_AVAILABLE");
        JSONArray l = new JSONArray();
        for (Object[] o : r) {
            if (l.length() < MAX_LIGNES) {
                l.put(new JSONObject().put("produitId", texte(o[0])).put("cip", texte(o[1])).put("libelle", texte(o[2]))
                        .put("emplacement", texte(o[3])).put("stockReel", nombre(o[4])));
            }
        }
        return new JSONObject().put("nb", r.size()).put("lignes", l).put("explication",
                "Un stock ne peut pas être négatif : vente forcée sans stock, ou entrée non saisie.");
    }

    /* ------------------------------------------------------------------ caisses */

    private JSONObject caissesOuvertes() {
        List<Object[]> r = lignes(
                "SELECT rc.ld_CAISSE_ID, CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME), rc.dt_CREATED,"
                        + " DATEDIFF(CURDATE(), DATE(rc.dt_CREATED))"
                        + " FROM t_resume_caisse rc JOIN t_user u ON u.lg_USER_ID = rc.lg_USER_ID"
                        + " WHERE rc.str_STATUT = ?1 AND DATE(rc.dt_CREATED) < CURDATE() ORDER BY rc.dt_CREATED",
                Constant.STATUT_IS_USING);
        JSONArray l = new JSONArray();
        for (Object[] o : r) {
            l.put(new JSONObject().put("caisse", texte(o[0])).put("caissier", texte(o[1]))
                    .put("ouverture", dateHeure(o[2])).put("jours", nombre(o[3])));
        }
        return new JSONObject().put("nb", r.size()).put("lignes", l).put("explication",
                "Caisse ouverte un jour précédent et jamais fermée : ses ventes ne sont rapprochées d'aucun billetage.");
    }

    private JSONObject billetage(LocalDate debut, LocalDate fin, TUser utilisateur) {
        JSONObject a = caisseService.analyseEcarts(debut, fin, utilisateur, true, null, 0);
        JSONObject total = a.optJSONObject("total");
        JSONArray plusGros = a.optJSONArray("plusGros");
        JSONObject s = new JSONObject().put("lignes", plusGros == null ? new JSONArray() : plusGros).put("explication",
                "Caisses fermées de la période dont le billetage diffère du montant attendu (négatif = manquant).");
        if (total == null) {
            return s.put("nb", 0);
        }
        return s.put("nb", total.optInt("manquants") + total.optInt("surplus"))
                .put("montant", total.optLong("montantManquant") + total.optLong("montantSurplus"))
                .put("caisses", total.optInt("caisses")).put("manquants", total.optInt("manquants"))
                .put("montantManquant", total.optLong("montantManquant")).put("surplus", total.optInt("surplus"))
                .put("montantSurplus", total.optLong("montantSurplus"))
                .put("sansBilletage", total.optInt("sansBilletage"));
    }

    /* ------------------------------------------------------------------ differes */

    /** Ventes differees closes et non annulees d'un client (meme base que le releve des differes). */
    private static final String VENTES_DIFFEREES = " FROM t_preenregistrement_compte_client tp"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID"
            + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID"
            + " WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND tp.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0";

    private JSONObject differes() {
        List<Object[]> r = lignes("SELECT x.id, x.nom, x.du, x.regle, x.reste FROM (SELECT c.lg_CLIENT_ID id,"
                + " CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME) nom," + " (SELECT COALESCE(SUM(tp.int_PRICE), 0)"
                + VENTES_DIFFEREES + ") du,"
                + " (SELECT COALESCE(SUM(m.montantRegle), 0) FROM mvttransaction m WHERE m.typeMvtCaisseId = ?1"
                + "   AND m.checked = 1 AND m.organisme = c.lg_CLIENT_ID) regle,"
                + " (SELECT COALESCE(SUM(tp.int_PRICE_RESTE), 0)" + VENTES_DIFFEREES + ") reste"
                + " FROM t_client c WHERE EXISTS (SELECT 1 FROM t_compte_client cc JOIN t_preenregistrement_compte_client tp"
                + "   ON tp.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID)) x"
                + " WHERE x.du - x.regle <> x.reste ORDER BY ABS(x.du - x.regle - x.reste) DESC",
                Constant.MVT_REGLE_DIFF);
        JSONArray l = new JSONArray();
        long montant = 0;
        for (Object[] o : r) {
            long releve = nombre(o[2]) - nombre(o[3]), reste = nombre(o[4]);
            montant += Math.abs(releve - reste);
            if (l.length() < MAX_LIGNES) {
                l.put(new JSONObject().put("clientId", texte(o[0])).put("client", texte(o[1]))
                        .put("ventes", nombre(o[2])).put("reglements", nombre(o[3])).put("soldeReleve", releve)
                        .put("resteDu", reste).put("ecart", reste - releve));
            }
        }
        return new JSONObject().put("nb", r.size()).put("montant", montant).put("lignes", l).put("explication",
                "Le reste dû enregistré sur les ventes différées du client ne correspond pas à son relevé "
                        + "(ventes différées − règlements) : un règlement n'a pas été imputé sur les ventes, ou l'inverse.");
    }

    /* ------------------------------------------------------------------ carnets depot */

    private JSONObject carnets() {
        List<Object[]> r = lignes(
                "SELECT x.id, x.nom, x.solde, x.ventes, x.regle, x.retours FROM (SELECT t.lg_TIERS_PAYANT_ID id,"
                        + " t.str_NAME nom, COALESCE(t.account, 0) solde,"
                        + " (SELECT COALESCE(SUM(v.int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent v"
                        + "   JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID"
                        + "   JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = v.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                        + "   WHERE cctp.lg_TIERS_PAYANT_ID = t.lg_TIERS_PAYANT_ID AND v.str_STATUT = 'is_Closed'"
                        + "   AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0) ventes,"
                        + " (SELECT COALESCE(SUM(rc.montant_paye), 0) FROM reglement_carnet rc WHERE rc.tierspayant_id = t.lg_TIERS_PAYANT_ID) regle,"
                        + " (SELECT COALESCE(SUM(d.qty_retour * d.prix_uni), 0) FROM retour_carnet_detail d"
                        + "   JOIN retour_carnet rt ON rt.id = d.retour_carnet_id WHERE rt.tierspayant_id = t.lg_TIERS_PAYANT_ID"
                        + "   AND rt.status = 'completed') retours"
                        + " FROM t_tiers_payant t WHERE t.is_depot = 1 OR t.to_be_exclude = 1 OR COALESCE(t.account, 0) <> 0) x"
                        + " WHERE x.solde <> x.ventes - x.regle - x.retours ORDER BY ABS(x.solde - x.ventes + x.regle + x.retours) DESC");
        JSONArray l = new JSONArray();
        long montant = 0;
        for (Object[] o : r) {
            long solde = nombre(o[2]), calcule = nombre(o[3]) - nombre(o[4]) - nombre(o[5]);
            montant += Math.abs(solde - calcule);
            l.put(new JSONObject().put("tiersPayantId", texte(o[0])).put("depot", texte(o[1])).put("solde", solde)
                    .put("ventes", nombre(o[3])).put("reglements", nombre(o[4])).put("retours", nombre(o[5]))
                    .put("soldeCalcule", calcule).put("ecart", solde - calcule));
        }
        return new JSONObject().put("nb", r.size()).put("montant", montant).put("lignes", l).put("explication",
                "Le solde du carnet ne correspond pas à ses ventes moins les règlements et les retours.");
    }

    /* ------------------------------------------------------------------ controles du centre de support */

    private JSONObject controles() {
        List<Object[]> defs = lignes("SELECT code, libelle, module, requete_sql FROM t_support_controle"
                + " WHERE actif = 1 ORDER BY ordre, code");
        JSONArray l = new JSONArray();
        int enEcart = 0;
        for (Object[] d : defs) {
            String sql = texte(d[3]).trim();
            while (sql.endsWith(";")) {
                sql = sql.substring(0, sql.length() - 1).trim();
            }
            JSONObject ligne = new JSONObject().put("code", texte(d[0])).put("libelle", texte(d[1])).put("module",
                    texte(d[2]));
            if (!selectSeul(sql)) {
                l.put(ligne.put("erreur", "Requête non lue (SELECT uniquement)"));
                continue;
            }
            try {
                long n = nombre(em.createNativeQuery("SELECT COUNT(*) FROM (" + sql + ") audit_x").getSingleResult());
                if (n > 0) {
                    enEcart++;
                }
                l.put(ligne.put("cas", n));
            } catch (RuntimeException e) {
                l.put(ligne.put("erreur", "Contrôle non exécuté"));
            }
        }
        return new JSONObject().put("nb", enEcart).put("lignes", l).put("explication",
                "Contrôles automatiques du centre de support, rejoués ici en simple comptage (sans ticket ni événement).");
    }

    /** Une seule instruction, commencant par SELECT ou WITH, sans point-virgule interne. */
    static boolean selectSeul(String sql) {
        if (sql == null) {
            return false;
        }
        String s = sql.trim().toUpperCase(java.util.Locale.ROOT);
        return (s.startsWith("SELECT") || s.startsWith("WITH")) && !s.contains(";");
    }
}
