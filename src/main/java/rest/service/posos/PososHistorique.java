package rest.service.posos;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Historique des analyses Posos (point 35) : une ligne par analyse, sans nom de produit ni contexte du patient. La
 * trace ne doit jamais empecher l'analyse : elle a sa propre transaction et ses erreurs sont seulement journalisees.
 */
@Stateless
public class PososHistorique {

    private static final Logger LOG = Logger.getLogger(PososHistorique.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void noter(String userId, String source, String reference, int nbProduits, PososResultat r) {
        try {
            List<PososResultat.Alerte> alertes = r == null ? java.util.Collections.emptyList() : r.getAlertes();
            em.createNativeQuery("INSERT INTO t_posos_analyse (id, created_at, lg_USER_ID, source, reference,"
                    + " nb_produits, nb_alertes, gravite_max, mode, disponible) VALUES (?1, NOW(), ?2, ?3, ?4, ?5, ?6,"
                    + " ?7, ?8, ?9)").setParameter(1, UUID.randomUUID().toString()).setParameter(2, userId)
                    .setParameter(3, source).setParameter(4, StringUtils.left(reference, 60))
                    .setParameter(5, nbProduits).setParameter(6, alertes.size())
                    .setParameter(7, alertes.isEmpty() ? null : StringUtils.left(alertes.get(0).getGravite(), 60))
                    .setParameter(8, r != null && r.isDemonstration() ? "DEMONSTRATION" : "POSOS")
                    .setParameter(9, r != null && r.isDisponible() ? 1 : 0).executeUpdate();
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "historique Posos non enregistre", e);
        }
    }

    @SuppressWarnings("unchecked")
    public JSONObject lister(LocalDate du, LocalDate au, String utilisateur) {
        StringBuilder sql = new StringBuilder("SELECT a.id, DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%s'),"
                + " a.lg_USER_ID, TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))),"
                + " a.source, a.reference, a.nb_produits, a.nb_alertes, a.gravite_max, a.mode, a.disponible"
                + " FROM t_posos_analyse a LEFT JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
                + " WHERE a.created_at >= ?1 AND a.created_at < ?2");
        if (StringUtils.isNotBlank(utilisateur)) {
            sql.append(" AND a.lg_USER_ID = ?3");
        }
        sql.append(" ORDER BY a.created_at DESC LIMIT 1000");
        javax.persistence.Query q = em.createNativeQuery(sql.toString())
                .setParameter(1, Timestamp.valueOf(du.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(au.plusDays(1).atStartOfDay()));
        if (StringUtils.isNotBlank(utilisateur)) {
            q.setParameter(3, utilisateur.trim());
        }
        JSONArray data = new JSONArray();
        int alertes = 0;
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            alertes += ((Number) r[7]).intValue();
            data.put(new JSONObject().put("id", r[0]).put("le", r[1]).put("utilisateurId", texte(r[2]))
                    .put("utilisateur", texte(r[3])).put("source", r[4]).put("reference", texte(r[5]))
                    .put("nbProduits", ((Number) r[6]).intValue()).put("nbAlertes", ((Number) r[7]).intValue())
                    .put("graviteMax", texte(r[8])).put("mode", r[9]).put("disponible", Boolean.TRUE.equals(r[10])
                            || (r[10] instanceof Number && ((Number) r[10]).intValue() == 1)));
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("alertes", alertes).put("data",
                data);
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
