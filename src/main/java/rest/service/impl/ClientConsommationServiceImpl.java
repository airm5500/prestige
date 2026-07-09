package rest.service.impl;

import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ClientConsommationService;

/**
 * Analyse de la consommation d'un client par medicament sur une periode.
 */
@Stateless
public class ClientConsommationServiceImpl implements ClientConsommationService {

    private static final Logger LOG = Logger.getLogger(ClientConsommationServiceImpl.class.getName());
    private static final int SEUIL_DORMANT_JOURS = 90;

    private static final String BASE_FROM = " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " WHERE p.lg_CLIENT_ID = ?1 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND DATE(p.dt_UPDATED) BETWEEN ?2 AND ?3 AND (f.str_NAME LIKE ?4 OR f.int_CIP LIKE ?4)";

    private static final String DATA_QUERY = "SELECT f.lg_FAMILLE_ID AS familleId, f.int_CIP AS cip,"
            + " f.str_NAME AS name, MAX(DATE(p.dt_UPDATED)) AS dernierAchat, MIN(DATE(p.dt_UPDATED)) AS premierAchat,"
            + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS nbAchats, COALESCE(SUM(d.int_QUANTITY),0) AS qteTotale,"
            + " COALESCE(SUM(d.int_PRICE),0) AS montant" + BASE_FROM
            + " GROUP BY f.lg_FAMILLE_ID ORDER BY nbAchats DESC, montant DESC";

    private static final String COUNT_QUERY = "SELECT COUNT(DISTINCT d.lg_FAMILLE_ID)" + BASE_FROM;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private LocalDate parseOr(String value, LocalDate fallback) {
        try {
            return LocalDate.parse(value);
        } catch (Exception e) {
            return fallback;
        }
    }

    @Override
    public JSONObject consommation(String clientId, String dtStart, String dtEnd, String query, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            LocalDate fin = parseOr(dtEnd, LocalDate.now());
            LocalDate debut = parseOr(dtStart, fin.minusMonths(12));
            String search = StringUtils.isEmpty(query) ? "%%" : "%" + query + "%";

            Query countQuery = em.createNativeQuery(COUNT_QUERY).setParameter(1, clientId)
                    .setParameter(2, Date.valueOf(debut)).setParameter(3, Date.valueOf(fin)).setParameter(4, search);
            long total = ((Number) countQuery.getSingleResult()).longValue();
            if (total == 0) {
                return json.put("total", 0).put("data", new JSONArray());
            }

            Query q = em.createNativeQuery(DATA_QUERY, Tuple.class).setParameter(1, clientId)
                    .setParameter(2, Date.valueOf(debut)).setParameter(3, Date.valueOf(fin)).setParameter(4, search);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Tuple> tuples = q.getResultList();
            JSONArray datas = new JSONArray();
            for (Tuple t : tuples) {
                long nbAchats = ((Number) t.get("nbAchats")).longValue();
                long qteTotale = ((Number) t.get("qteTotale")).longValue();
                long montant = ((Number) t.get("montant")).longValue();
                LocalDate dernierAchat = ((Date) t.get("dernierAchat")).toLocalDate();
                LocalDate premierAchat = ((Date) t.get("premierAchat")).toLocalDate();

                // frequence moyenne de renouvellement (en jours) entre le premier et
                // le dernier achat de la periode
                long frequenceJours = 0;
                if (nbAchats > 1) {
                    frequenceJours = ChronoUnit.DAYS.between(premierAchat, dernierAchat) / (nbAchats - 1);
                }
                double qteMoyenne = nbAchats > 0 ? (double) qteTotale / nbAchats : 0;

                JSONObject row = new JSONObject();
                row.put("familleId", t.get("familleId", String.class));
                row.put("cip", t.get("cip", String.class));
                row.put("name", t.get("name", String.class));
                row.put("dernierAchat", dernierAchat.toString());
                row.put("premierAchat", premierAchat.toString());
                row.put("nbAchats", nbAchats);
                row.put("qteTotale", qteTotale);
                row.put("qteMoyenne", Math.round(qteMoyenne * 100.0) / 100.0);
                row.put("frequenceJours", frequenceJours);
                row.put("montant", montant);
                row.put("habitude", habitude(nbAchats, frequenceJours, dernierAchat));
                datas.put(row);
            }
            return json.put("total", total).put("data", datas);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("total", 0).put("data", new JSONArray());
        }
    }

    /**
     * Classification de l'habitude d'achat : dormant (plus d'achat depuis 90 jours), bimensuel (renouvellement <= 20
     * jours), mensuel (21 a 45 jours), ponctuel sinon.
     */
    private String habitude(long nbAchats, long frequenceJours, LocalDate dernierAchat) {
        if (ChronoUnit.DAYS.between(dernierAchat, LocalDate.now()) > SEUIL_DORMANT_JOURS) {
            return "Dormant";
        }
        if (nbAchats < 2) {
            return "Ponctuel";
        }
        if (frequenceJours <= 20) {
            return "Bimensuel";
        }
        if (frequenceJours <= 45) {
            return "Mensuel";
        }
        return "Ponctuel";
    }
}
