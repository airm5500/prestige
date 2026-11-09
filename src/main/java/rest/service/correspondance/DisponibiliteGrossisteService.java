package rest.service.correspondance;

import dal.TUser;
import java.util.Collections;
import java.util.List;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.DisponibiliteService;
import rest.service.correspondance.DisponibiliteRegles.Source;

/**
 * Lot 5 : disponibilite d'un produit chez un grossiste, a la demande, depuis la vue par produit de l'ecran «
 * Correspondance grossistes ». Regles dans {@link DisponibiliteRegles}.
 * <ul>
 * <li>PharmaML : demande d'INFORMATION produit par {@link DisponibiliteService#verifier} (jamais une commande), le
 * resultat est enregistre dans {@code t_disponibilite_produit} (source FICHE) ; une lecture de moins de 15 minutes,
 * quelle que soit son origine (suggestion, commande, fiche), est rendue avec sa date sans nouvel appel ;</li>
 * <li>extranet : les connecteurs des extranets ne sont pas sur cette branche ; la source repond « absente » sans
 * valeur, jusqu'a leur arrivee ;</li>
 * <li>source(s) par grossiste : {@code t_grossiste.int_SOURCE_DISPO} (0 PharmaML, 1 extranet, 2 les deux).</li>
 * </ul>
 */
@Stateless
public class DisponibiliteGrossisteService {

    private static final String FORMAT_DATE = "'%Y-%m-%d %H:%i:%s'";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private DisponibiliteService disponibiliteService;

    /** Reglage du grossiste, ou null s'il n'existe pas. */
    private Number reglage(String grossisteId) {
        @SuppressWarnings("unchecked")
        List<Object> r = em.createNativeQuery("SELECT int_SOURCE_DISPO FROM t_grossiste WHERE lg_GROSSISTE_ID = ?1")
                .setParameter(1, grossisteId).getResultList();
        return r.isEmpty() ? null : (r.get(0) == null ? 0 : (Number) r.get(0));
    }

    /** Grossistes actifs et leur reglage (vue « Sources de disponibilité »). */
    public JSONObject sources() {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT lg_GROSSISTE_ID, str_LIBELLE, int_SOURCE_DISPO,"
                + " IFNULL(str_URL_PHARMAML, '') <> '' AS a_pharmaml, int_PHARMAML_DISPO FROM t_grossiste"
                + " WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE").getResultList();
        JSONArray data = new JSONArray();
        for (Object[] r : l) {
            data.put(new JSONObject().put("grossisteId", r[0]).put("grossiste", r[1])
                    .put("reglage", r[2] == null ? 0 : ((Number) r[2]).intValue())
                    .put("pharmaml", DisponibiliteRegles.vrai(r[3]))
                    .put("pharmamlActive", DisponibiliteRegles.vrai(r[4])));
        }
        return new JSONObject().put("success", true).put("data", data);
    }

    /** Enregistre le reglage d'un grossiste (0, 1 ou 2) ; renvoie la valeur relue. */
    public JSONObject enregistrerSource(String grossisteId, int reglage) {
        if (!DisponibiliteRegles.reglageValide(reglage)) {
            return new JSONObject().put("success", false).put("msg", "Réglage attendu : 0, 1 ou 2.");
        }
        int n = em.createNativeQuery("UPDATE t_grossiste SET int_SOURCE_DISPO = ?1 WHERE lg_GROSSISTE_ID = ?2")
                .setParameter(1, reglage).setParameter(2, grossisteId).executeUpdate();
        if (n == 0) {
            return new JSONObject().put("success", false).put("msg", "Grossiste introuvable.");
        }
        return new JSONObject().put("success", true).put("grossisteId", grossisteId)
                .put("reglage", reglage(grossisteId).intValue()).put("msg", "Source de disponibilité enregistrée.");
    }

    /** Derniere lecture PharmaML de chaque grossiste pour ce produit (sans appel), avec le reglage du grossiste. */
    public JSONObject dernieres(String familleId) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT d.lg_GROSSISTE_ID, gr.str_LIBELLE AS grossiste_libelle, "
                + COLONNES
                + " FROM t_disponibilite_produit d LEFT JOIN t_grossiste gr ON gr.lg_GROSSISTE_ID = d.lg_GROSSISTE_ID JOIN (SELECT lg_GROSSISTE_ID AS g, MAX(dt_CREATED) AS dt"
                + " FROM t_disponibilite_produit WHERE lg_FAMILLE_ID = ?1 GROUP BY lg_GROSSISTE_ID) m"
                + " ON m.g = d.lg_GROSSISTE_ID AND m.dt = d.dt_CREATED WHERE d.lg_FAMILLE_ID = ?2")
                .setParameter(1, familleId).setParameter(2, familleId).getResultList();
        JSONObject parGrossiste = new JSONObject();
        for (Object[] r : l) {
            parGrossiste.put((String) r[0], lecture(r, 2).put("source", Source.PHARMAML.name()).put("cache", true)
                    .put("grossiste", r[1] == null ? JSONObject.NULL : r[1]));
        }
        return new JSONObject().put("success", true).put("familleId", familleId).put("dernieres", parGrossiste);
    }

    private static final String COLONNES = "d.str_STATUT, IFNULL(d.str_CODE_REPONSE, '') AS code_reponse,"
            + " IFNULL(d.str_LIBELLE, '') AS libelle, IFNULL(d.str_DATE_DISPO, '') AS date_dispo, d.int_QTE_DISPO,"
            + " IFNULL(d.str_REMPLACANT_NOM, '') AS remplacant, d.int_PRIX, DATE_FORMAT(d.dt_CREATED, " + FORMAT_DATE
            + ") AS lu_le, d.str_SOURCE, UNIX_TIMESTAMP(d.dt_CREATED) * 1000 AS lu_ms, UNIX_TIMESTAMP(NOW(3)) * 1000 AS maintenant_ms";

    private static JSONObject lecture(Object[] r, int i) {
        return new JSONObject().put("succes", true).put("statut", r[i]).put("codeReponse", r[i + 1])
                .put("libelle", r[i + 2]).put("dateDispo", r[i + 3])
                .put("qteDispo", r[i + 4] == null ? JSONObject.NULL : r[i + 4]).put("remplacant", r[i + 5])
                .put("prix", r[i + 6] == null ? JSONObject.NULL : r[i + 6]).put("luLe", r[i + 7])
                .put("origine", r[i + 8]);
    }

    private Object[] derniereLecture(String familleId, String grossisteId) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery("SELECT " + COLONNES + " FROM t_disponibilite_produit d"
                        + " WHERE d.lg_FAMILLE_ID = ?1 AND d.lg_GROSSISTE_ID = ?2 ORDER BY d.dt_CREATED DESC LIMIT 1")
                .setParameter(1, familleId).setParameter(2, grossisteId).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    /**
     * Disponibilite du produit chez le grossiste, par la ou les sources reglees. {@code forcer} : relire meme si une
     * lecture de moins de 15 minutes existe.
     */
    public JSONObject verifier(String familleId, String grossisteId, boolean forcer, TUser user) {
        Number reglage = reglage(grossisteId);
        if (reglage == null) {
            return new JSONObject().put("success", false).put("msg", "Grossiste introuvable.");
        }
        JSONArray resultats = new JSONArray();
        for (Source s : DisponibiliteRegles.sources(reglage)) {
            resultats.put(s == Source.PHARMAML ? pharmaml(familleId, grossisteId, forcer, user) : extranet());
        }
        return new JSONObject().put("success", true).put("familleId", familleId).put("grossisteId", grossisteId)
                .put("reglage", reglage.intValue()).put("resultats", resultats);
    }

    private JSONObject pharmaml(String familleId, String grossisteId, boolean forcer, TUser user) {
        Object[] avant = derniereLecture(familleId, grossisteId);
        if (avant != null && DisponibiliteRegles.cacheValide(((Number) avant[9]).longValue(),
                ((Number) avant[10]).longValue(), forcer)) {
            return lecture(avant, 0).put("source", Source.PHARMAML.name()).put("cache", true);
        }
        JSONObject r = disponibiliteService.verifier(DisponibiliteService.FICHE, familleId, grossisteId,
                Collections.singletonList(familleId), user);
        if (!r.optBoolean("success")) {
            // echec : le message, jamais une valeur (pas meme l'ancienne lecture, qui reste affichee a part avec sa
            // date)
            return new JSONObject().put("source", Source.PHARMAML.name()).put("succes", false)
                    .put("msg", r.optString("msg", "Vérification impossible.")).put("cache", false);
        }
        Object[] apres = derniereLecture(familleId, grossisteId);
        if (apres == null) {
            return new JSONObject().put("source", Source.PHARMAML.name()).put("succes", false)
                    .put("msg", "Aucune réponse enregistrée.").put("cache", false);
        }
        return lecture(apres, 0).put("source", Source.PHARMAML.name()).put("cache", false);
    }

    private static JSONObject extranet() {
        return new JSONObject().put("source", Source.EXTRANET.name()).put("succes", false).put("absente", true)
                .put("cache", false).put("msg", "Source extranet absente sur ce poste : la disponibilité par l'extranet"
                        + " du grossiste arrivera avec les connecteurs.");
    }
}
