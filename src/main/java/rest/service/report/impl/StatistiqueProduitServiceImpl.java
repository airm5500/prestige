package rest.service.report.impl;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Year;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.dto.ArticleVenduDTO;
import rest.service.dto.StatistiqueProduitAnnuelleDTO;
import rest.service.report.StatistiqueProduitService;
import util.CommonUtils;
import util.DateConverter;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class StatistiqueProduitServiceImpl implements StatistiqueProduitService {

    private static final Logger LOG = Logger.getLogger(StatistiqueProduitServiceImpl.class.getName());
    private static final String STATUT = "is_Closed";

    private static final String YEAR_SQL_QUERY = " SELECT f.`lg_FAMILLE_ID` AS id, f.`int_CIP` codeCip,f.`str_NAME` as libelle, SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=1 THEN d.`int_QUANTITY` ELSE 0 END ) AS janvier\n"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=2 THEN d.`int_QUANTITY` ELSE 0 END ) AS fevrier,"
            + " SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=3 THEN d.`int_QUANTITY` ELSE 0 END ) AS mars "
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=4 THEN d.`int_QUANTITY` ELSE 0 END ) AS avril"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=5 THEN d.`int_QUANTITY` ELSE 0 END ) AS mai, "
            + " SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=6 THEN d.`int_QUANTITY` ELSE 0 END ) AS juin,"
            + " SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=7 THEN d.`int_QUANTITY` ELSE 0 END ) AS juillet"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=8 THEN d.`int_QUANTITY` ELSE 0 END ) AS aout"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=9 THEN d.`int_QUANTITY` ELSE 0 END ) AS septembre"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=10 THEN d.`int_QUANTITY` ELSE 0 END ) AS octobre"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=11 THEN d.`int_QUANTITY` ELSE 0 END ) AS novembre"
            + ", SUM(CASE WHEN MONTH(p.`dt_UPDATED`)=12 THEN d.`int_QUANTITY` ELSE 0 END ) AS decembre "
            + " FROM  t_preenregistrement p,t_preenregistrement_detail d,t_famille f,t_user u WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` "
            + " AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND p.`int_PRICE` >0 AND p.`b_IS_CANCEL`=0 AND p.`lg_TYPE_VENTE_ID` <> ?1 AND  u.`lg_USER_ID`=p.`lg_USER_ID` AND u.`lg_EMPLACEMENT_ID`=?2 "
            + "  AND p.`str_STATUT`=?3 AND YEAR(p.`dt_UPDATED`)=?4 {likeStatement} {rayonStatement}  GROUP  BY  id ORDER BY libelle ";

    private static final String YEAR_COUNT_SQL_QUERY = "SELECT  count(DISTINCT f.`lg_FAMILLE_ID`) FROM  t_preenregistrement p,t_preenregistrement_detail d,t_famille f,t_user u WHERE p.`lg_PREENREGISTREMENT_ID`=d.`lg_PREENREGISTREMENT_ID` "
            + " AND f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND p.`int_PRICE` >0 AND p.`b_IS_CANCEL`=0 AND p.`lg_TYPE_VENTE_ID` <> ?1 AND  u.`lg_USER_ID`=p.`lg_USER_ID` AND u.`lg_EMPLACEMENT_ID`=?2  "
            + "  AND p.`str_STATUT`=?3 AND YEAR(p.`dt_UPDATED`)=?4 {likeStatement} {rayonStatement}  ";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String ARTICLES_ANNULES_QUERY = "SELECT u.`str_FIRST_NAME` as userFirstName,u.`str_LAST_NAME` AS userLastName, COUNT(f.`lg_FAMILLE_ID`) AS numberOfTime , f.`lg_FAMILLE_ID` AS produitId,SUM(d.`int_QUANTITY`) AS quantity, f.`int_CIP` AS cip,f.`str_NAME` AS produitName,f.`int_PAF` AS prixAchat,f.`int_PRICE` AS prixUni FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` JOIN t_famille f ON f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` JOIN t_user u ON u.`lg_USER_ID`=p.`lg_USER_ID` WHERE p.`str_STATUT`='is_Closed' AND p.`b_IS_CANCEL`=1 AND DATE(p.`dt_CREATED`) BETWEEN ?1 AND ?2 AND f.`str_STATUT`='enable' {userClose} GROUP BY  f.`lg_FAMILLE_ID`,u.lg_USER_ID ORDER BY f.`str_NAME`";
    private static final String ARTICLES_ANNULES_COUNT_QUERY = "SELECT COUNT( distinct f.`lg_FAMILLE_ID`) AS product_Count   FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` JOIN t_famille f ON f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` JOIN t_user u ON u.`lg_USER_ID`=p.`lg_USER_ID` WHERE p.`str_STATUT`='is_Closed' AND p.`b_IS_CANCEL`=1 AND DATE(p.`dt_CREATED`) BETWEEN ?1 AND ?2 AND f.`str_STATUT`='enable' {userClose} GROUP BY  f.`lg_FAMILLE_ID`,u.lg_USER_ID";

    @Override
    public JSONObject getIntervalAnnees() {
        int[] months = CommonUtils.getYears();

        JSONArray datas = new JSONArray();
        for (int i = 0; i < months.length; i++) {
            int value = months[i];
            JSONObject json = new JSONObject();
            json.put("value", value);
            datas.put(json);

        }
        return FunctionUtils.returnData(datas);
    }

    @Override
    public List<StatistiqueProduitAnnuelleDTO> getVenteProduits(Integer year, String search, String userEmplacement,
            String rayonId, int start, int limit, boolean all) {
        if (Objects.isNull(year)) {
            year = Year.now().getValue();
        }
        return getVentes(year, search, userEmplacement, rayonId, start, limit, all).stream().map(this::build)
                .collect(Collectors.toList());
    }

    @Override
    public JSONObject getVenteProduits(Integer year, String search, String userEmplacement, String rayonId, int start,
            int limit) {
        if (Objects.isNull(year)) {
            year = Year.now().getValue();
        }
        long count = getCountVentes(year, search, userEmplacement, rayonId);
        return FunctionUtils
                .returnData(this.getVenteProduits(year, search, userEmplacement, rayonId, start, limit, false), count);
    }

    private String builQuery(String search, String rayonId, String sql) {

        if (StringUtils.isNotEmpty(search)) {
            sql = sql.replace("{likeStatement}",
                    " AND (f.`int_CIP` LIKE '" + search + "%' OR f.`str_NAME` LIKE '" + search + "%' )");
        } else {
            sql = sql.replace("{likeStatement}", "");
        }
        if (StringUtils.isNotBlank(rayonId)) {
            sql = sql.replace("{rayonStatement}", String.format(" AND f.`lg_ZONE_GEO_ID`=%s ", rayonId));
        } else {
            sql = sql.replace("{rayonStatement}", "");
        }
        LOG.log(Level.INFO, "sql--- getVenteProduits annuelle vente {0}", sql);
        return sql;
    }

    List<Tuple> getVentes(int year, String search, String userEmplacement, String rayonId, int start, int limit,
            boolean all) {
        try {
            Query query = em.createNativeQuery(builQuery(search, rayonId, YEAR_SQL_QUERY), Tuple.class)
                    .setParameter(1, DateConverter.DEPOT_EXTENSION).setParameter(2, userEmplacement)
                    .setParameter(3, STATUT).setParameter(4, year);
            if (!all) {
                query.setFirstResult(start);
                query.setMaxResults(limit);
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private long getCountVentes(int year, String search, String userEmplacement, String rayonId) {
        try {
            Query query = em.createNativeQuery(builQuery(search, rayonId, YEAR_COUNT_SQL_QUERY));
            query.setParameter(1, DateConverter.DEPOT_EXTENSION);
            query.setParameter(2, userEmplacement);
            query.setParameter(3, STATUT);
            query.setParameter(4, year);
            return ((BigInteger) query.getSingleResult()).longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private StatistiqueProduitAnnuelleDTO build(Tuple t) {
        return StatistiqueProduitAnnuelleDTO.builder().id(t.get("id", String.class))
                .codeCip(t.get("codeCip", String.class)).libelle(t.get("libelle", String.class))
                .janvier(t.get("janvier", BigDecimal.class).intValue())
                .fevrier(t.get("fevrier", BigDecimal.class).intValue()).mars(t.get("mars", BigDecimal.class).intValue())
                .avril(t.get("avril", BigDecimal.class).intValue()).mai(t.get("mai", BigDecimal.class).intValue())
                .juin(t.get("juin", BigDecimal.class).intValue()).juillet(t.get("juillet", BigDecimal.class).intValue())
                .aout(t.get("aout", BigDecimal.class).intValue())
                .septembre(t.get("septembre", BigDecimal.class).intValue())
                .octobre(t.get("octobre", BigDecimal.class).intValue())
                .novembre(t.get("novembre", BigDecimal.class).intValue())
                .decembre(t.get("decembre", BigDecimal.class).intValue()).build();
    }

    @Override
    public List<ArticleVenduDTO> fetchListProduitAnnule(String dtStart, String dtEnd, String userId, int start,
            int limit, boolean all) {
        return getListProduitAnnule(dtStart, dtEnd, userId, start, limit, all).stream()
                .map(this::buildArticleVenduFromTuple).collect(Collectors.toList());
    }

    private String buildQuery(String userId, String slq) {
        if (StringUtils.isNotEmpty(userId)) {
            return slq.replace("{userClose}", String.format(" AND p.`lg_USER_ID`=%s ", userId));
        }
        return slq.replace("{userClose}", "");
    }

    private List<Tuple> getListProduitAnnule(String dtStart, String dtEnd, String userId, int start, int limit,
            boolean all) {
        try {
            Query q = em.createNativeQuery(buildQuery(userId, ARTICLES_ANNULES_QUERY), Tuple.class);
            q.setParameter(1, java.sql.Date.valueOf(dtStart));
            q.setParameter(2, java.sql.Date.valueOf(dtEnd));
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }

            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private int getListProduitAnnuleCount(String dtStart, String dtEnd, String userId) {
        try {
            Query q = em.createNativeQuery(buildQuery(userId, ARTICLES_ANNULES_COUNT_QUERY));
            q.setParameter(1, java.sql.Date.valueOf(dtStart));
            q.setParameter(2, java.sql.Date.valueOf(dtEnd));
            return q.getResultList().size();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private ArticleVenduDTO buildArticleVenduFromTuple(Tuple t) {
        ArticleVenduDTO articleVendu = new ArticleVenduDTO();
        articleVendu.setCip(t.get("cip", String.class));
        articleVendu.setProduitName(t.get("produitName", String.class));
        articleVendu.setProduitId(t.get("produitId", String.class));
        articleVendu.setNumberOfTime(t.get("numberOfTime", BigInteger.class).intValue());
        articleVendu.setQuantity(t.get("quantity", BigDecimal.class).intValue());
        articleVendu.setPrixAchat(t.get("prixAchat", Integer.class));
        articleVendu.setPrixUni(t.get("prixUni", Integer.class));
        articleVendu.setFirstName(t.get("userFirstName", String.class));
        articleVendu.setLastName(t.get("userLastName", String.class));

        return articleVendu;
    }

    @Override
    public JSONObject fetchListProduitAnnule(String dtStart, String dtEnd, String userId, int start, int limit) {
        int count = getListProduitAnnuleCount(dtStart, dtEnd, userId);
        if (count == 0) {
            FunctionUtils.returnData(Collections.emptyList(), count);
        }
        return FunctionUtils.returnData(this.fetchListProduitAnnule(dtStart, dtEnd, userId, start, limit, false),
                count);
    }
}
