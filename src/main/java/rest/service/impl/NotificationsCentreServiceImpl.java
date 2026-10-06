package rest.service.impl;

import dal.TUser;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.FicheArticleService;
import rest.service.NotificationsCentreService;
import rest.service.SuggestionReserveService;

/**
 * Centre de notifications. Les definitions des nouvelles categories :
 * <ul>
 * <li>renouvellements : chaines d'ordonnances dont le renouvellement suivant tombe d'ici 7 jours ;</li>
 * <li>suggestions commandees non recues : statut « Commandee » depuis plus de 2 jours, commande liee non recue ;</li>
 * <li>commandes non recues : commande passee depuis plus de 2 jours sans aucun bon de livraison entre en stock ;</li>
 * <li>produits indisponibles : derniere reponse PharmaML « non disponible » de moins de 7 jours ;</li>
 * <li>traitements habituels a preparer : lignes « à préparer » des rappels par habitude d'achat (plan d'octobre,
 * 4.1).</li>
 * </ul>
 */
@Stateless
public class NotificationsCentreServiceImpl implements NotificationsCentreService {

    private static final Logger LOG = Logger.getLogger(NotificationsCentreServiceImpl.class.getName());

    static final int JOURS_RENOUVELLEMENT = 7;
    static final int JOURS_RECEPTION = 2;
    static final int JOURS_DISPONIBILITE = 7;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SuggestionReserveService suggestionReserveService;
    @EJB
    private FicheArticleService ficheArticleService;
    @EJB
    private OrdonnanceRenouvellementService renouvellementService;

    private static JSONObject cat(String cle, String libelle, String icone, String couleur, String menu,
            boolean historique) {
        return new JSONObject().put("cle", cle).put("libelle", libelle).put("icone", icone).put("couleur", couleur)
                .put("menu", menu).put("historique", historique);
    }

    @Override
    public JSONArray catalogue() {
        return new JSONArray()
                .put(cat("reserve", "Suggestions de réserve à traiter", "fa-exchange", "#48c9b0", "reservemanager",
                        true))
                .put(cat("perimes", "Péremptions proches (6 mois)", "fa-flask", "#ff6b6b", "peremptionquery", true))
                .put(cat("avoirs", "Ventes en avoir", "fa-reply-all", "#e67e22", "venteavoirmanager", true))
                .put(cat("renouvellements", "Ordonnances à renouveler (7 jours)", "fa-repeat", "#5dade2",
                        "ordonnanceclient", false))
                .put(cat("suggestions-commandees", "Suggestions commandées non reçues", "fa-truck", "#f5b041",
                        "i_sugg_manager", false))
                .put(cat("commandes", "Commandes passées non reçues", "fa-clock-o", "#af7ac5", "i_order_manager",
                        false))
                .put(cat("indisponibles", "Produits indisponibles chez le grossiste", "fa-ban", "#ec7063",
                        "i_sugg_manager", false))
                .put(cat("a-preparer", "Traitements habituels à préparer", "fa-medkit", "#58d68d", "rappelshabitude",
                        false));
    }

    /* ------------------------------------------------------------------ requetes */

    private static final String SQL_A_PREPARER = " FROM t_rappel_habitude r"
            + " JOIN t_client c ON c.lg_CLIENT_ID = r.lg_CLIENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID = r.lg_FAMILLE_ID"
            + " WHERE r.str_STATUT = 'A_PREPARER'";

    private static final String COMMANDE_NON_RECUE = " NOT EXISTS (SELECT 1 FROM t_bon_livraison b"
            + " WHERE b.lg_ORDER_ID = o.lg_ORDER_ID AND b.str_STATUT = 'is_Closed')";

    private static final String SQL_COMMANDES = " FROM t_order o LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
            + " WHERE o.str_STATUT = 'is_Closed' AND o.dt_UPDATED <= ?1 AND" + COMMANDE_NON_RECUE;

    private static final String SQL_SUGG_COMMANDEES = " FROM t_suggestion_order s LEFT JOIN t_order o ON o.lg_ORDER_ID = s.lg_ORDER_ID"
            + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = s.lg_GROSSISTE_ID"
            + " WHERE s.str_STATUT = 'commandee' AND s.dt_COMMANDEE IS NOT NULL AND s.dt_COMMANDEE <= ?1"
            + " AND (o.lg_ORDER_ID IS NULL OR o.str_STATUT <> 'is_Closed' OR" + COMMANDE_NON_RECUE + ")";

    /** Derniere reponse de disponibilite par produit, sur la fenetre. */
    private static final String SQL_INDISPONIBLES = " FROM t_disponibilite_produit d JOIN (SELECT lg_FAMILLE_ID, MAX(dt_CREATED) AS dernier"
            + " FROM t_disponibilite_produit WHERE dt_CREATED >= ?1 GROUP BY lg_FAMILLE_ID) x"
            + " ON x.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND x.dernier = d.dt_CREATED"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = d.lg_GROSSISTE_ID"
            + " WHERE d.str_STATUT = 'NON'";

    private long compter(String sql, Object... p) {
        Query q = em.createNativeQuery("SELECT COUNT(*)" + sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        Object r = q.getSingleResult();
        return r instanceof Number ? ((Number) r).longValue() : 0L;
    }

    private static Timestamp ilYa(int jours) {
        return Timestamp.valueOf(LocalDateTime.now().minusDays(jours));
    }

    /**
     * Ventes en avoir : MEMES criteres que la liste affichee par la cloche (avoirs ouverts, periode glissante d'un mois
     * sur la date de mise a jour de la vente, memes regles de visibilite que l'ecran des ventes).
     */
    private long avoirs(TUser user, boolean voirTout, boolean toutesActivites) {
        LocalDate fin = LocalDate.now();
        LocalDate debut = fin.minusMonths(1).plusDays(1);
        StringBuilder sql = new StringBuilder(
                " FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_AVOIR = TRUE"
                        + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED <= ?2");
        boolean parUtilisateur = !voirTout && user != null;
        boolean parEmplacement = voirTout && !toutesActivites && user != null;
        if (parUtilisateur) {
            sql.append(" AND p.lg_USER_ID = ?3");
        }
        if (parEmplacement) {
            sql.append(
                    " AND EXISTS (SELECT 1 FROM t_user uop WHERE uop.lg_USER_ID = p.lg_USER_ID AND uop.lg_EMPLACEMENT_ID = ?3)");
        }
        Timestamp d1 = Timestamp.valueOf(debut.atStartOfDay());
        Timestamp d2 = Timestamp.valueOf(fin.atTime(23, 59, 59));
        if (parUtilisateur) {
            return compter(sql.toString(), d1, d2, user.getLgUSERID());
        }
        if (parEmplacement) {
            return compter(sql.toString(), d1, d2, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        }
        return compter(sql.toString(), d1, d2);
    }

    @Override
    public Map<String, Long> compteurs(TUser user, boolean voirTout, boolean toutesActivites, Collection<String> cles) {
        Map<String, Long> m = new LinkedHashMap<>();
        for (String cle : cles) {
            try {
                switch (cle) {
                case "reserve":
                    m.put(cle, suggestionReserveService.compterSuggestionsEnAttente(user));
                    break;
                case "perimes":
                    m.put(cle, ficheArticleService.produitPerimesCount("", 6, "", "", "", "", ""));
                    break;
                case "avoirs":
                    m.put(cle, avoirs(user, voirTout, toutesActivites));
                    break;
                case "renouvellements":
                    m.put(cle, (long) renouvellementService.aRenouvelerSous(JOURS_RENOUVELLEMENT));
                    break;
                case "suggestions-commandees":
                    m.put(cle, compter(SQL_SUGG_COMMANDEES, ilYa(JOURS_RECEPTION)));
                    break;
                case "commandes":
                    m.put(cle, compter(SQL_COMMANDES, ilYa(JOURS_RECEPTION)));
                    break;
                case "indisponibles":
                    m.put(cle, compter(SQL_INDISPONIBLES, ilYa(JOURS_DISPONIBILITE)));
                    break;
                case "a-preparer":
                    m.put(cle, compter(SQL_A_PREPARER));
                    break;
                default:
                    break;
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "compteur de la cloche : " + cle, e);
                m.put(cle, 0L);
            }
        }
        return m;
    }

    private static String jour(Object o) {
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime().toLocalDate().toString();
        }
        return o == null ? "" : o.toString();
    }

    private static String t(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, int limite, Object... p) {
        Query q = em.createNativeQuery(sql + " LIMIT " + Math.max(1, Math.min(500, limite)));
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        return q.getResultList();
    }

    @Override
    public JSONObject liste(String cle, TUser user, int limite) {
        JSONArray a = new JSONArray();
        long total = 0;
        try {
            switch (String.valueOf(cle)) {
            case "suggestions-commandees":
                total = compter(SQL_SUGG_COMMANDEES, ilYa(JOURS_RECEPTION));
                for (Object[] r : lignes(
                        "SELECT s.str_REF, g.str_LIBELLE, s.dt_COMMANDEE, s.lg_SUGGESTION_ORDER_ID"
                                + SQL_SUGG_COMMANDEES + " ORDER BY s.dt_COMMANDEE ASC",
                        limite, ilYa(JOURS_RECEPTION))) {
                    a.put(new JSONObject().put("titre", "Suggestion " + t(r[0]))
                            .put("detail", t(r[1]) + " · commandée le " + jour(r[2])).put("date", jour(r[2]))
                            .put("id", t(r[3])));
                }
                break;
            case "commandes":
                total = compter(SQL_COMMANDES, ilYa(JOURS_RECEPTION));
                for (Object[] r : lignes("SELECT o.str_REF_ORDER, g.str_LIBELLE, o.dt_UPDATED, o.lg_ORDER_ID"
                        + SQL_COMMANDES + " ORDER BY o.dt_UPDATED ASC", limite, ilYa(JOURS_RECEPTION))) {
                    a.put(new JSONObject().put("titre", "Commande " + t(r[0]))
                            .put("detail", t(r[1]) + " · passée le " + jour(r[2])).put("date", jour(r[2]))
                            .put("id", t(r[3])));
                }
                break;
            case "indisponibles":
                total = compter(SQL_INDISPONIBLES, ilYa(JOURS_DISPONIBILITE));
                for (Object[] r : lignes(
                        "SELECT f.str_NAME, g.str_LIBELLE, d.dt_CREATED, d.str_LIBELLE, d.str_DATE_DISPO"
                                + SQL_INDISPONIBLES + " ORDER BY d.dt_CREATED DESC",
                        limite, ilYa(JOURS_DISPONIBILITE))) {
                    String motif = t(r[3]) + (t(r[4]).isEmpty() ? "" : " · disponible le " + t(r[4]));
                    a.put(new JSONObject().put("titre", t(r[0]))
                            .put("detail", t(r[1]) + (motif.isEmpty() ? "" : " · " + motif)).put("date", jour(r[2])));
                }
                break;
            case "renouvellements":
                total = renouvellementService.aRenouvelerSous(JOURS_RENOUVELLEMENT);
                break;
            case "a-preparer":
                total = compter(SQL_A_PREPARER);
                for (Object[] r : lignes(
                        "SELECT TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,'')))"
                                + ", f.str_NAME, r.dt_PREVU, r.int_FREQUENCE, r.id" + SQL_A_PREPARER
                                + " ORDER BY r.dt_PREVU ASC",
                        limite)) {
                    a.put(new JSONObject().put("titre", t(r[0]))
                            .put("detail", t(r[1]) + " · prévu le " + jour(r[2]) + " · tous les " + t(r[3]) + " jours")
                            .put("date", jour(r[2])).put("id", t(r[4])));
                }
                break;
            default:
                break;
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste de la cloche : " + cle, e);
        }
        return new JSONObject().put("total", total).put("results", a);
    }
}
