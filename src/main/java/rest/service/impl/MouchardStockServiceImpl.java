/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service.impl;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
import org.json.JSONObject;
import rest.service.MouchardStockService;
import rest.service.dto.LotDTO;
import rest.service.dto.MouchardStockDTO;
import util.FunctionUtils;

/**
 *
 * @author Hermann N'ZI
 */
@Stateless
public class MouchardStockServiceImpl implements MouchardStockService {

    private static final Logger LOG = Logger.getLogger(MouchardStockServiceImpl.class.getName());
    private static final String MVT_QUERY = "SELECT f.int_CIP, f.str_NAME, f.int_PAF, f.int_PRICE,m.qteDebut,m.qteMvt, m.qteFinale,t.`description`, u.str_FIRST_NAME, m.createdAt\n"
            + "FROM t_famille f, hmvtproduit m,typemvtproduit t, t_user u\n"
            + "WHERE m.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND u.lg_USER_ID=m.lg_USER_ID AND t.ID=m.typeMvt\n"
            + "AND DATE(m.createdAt) BETWEEN ?1 AND ?2 AND m.typeMvt <> 02";

    private static final String MVT_QUERY_COUNT = "SELECT count(f.int_CIP)"
            + "FROM t_famille f, hmvtproduit m,typemvtproduit t, t_user u\n"
            + "WHERE m.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND u.lg_USER_ID=m.lg_USER_ID AND t.ID=m.typeMvt\n"
            + "AND DATE(m.createdAt) BETWEEN ?1 AND ?2 AND m.typeMvt <> 02";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private final String pattern = "dd/MM/YYYY";
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);

    @Override
    // appEler dans la ressource
    public JSONObject getMouchardStock(String dtStart, String dtEnd, int limit, int start) {
        int total = getCount(dtStart, dtEnd);
        return FunctionUtils.returnData(this.getMouchardStock(dtStart, dtEnd, limit, start, true), total);

    }

    @Override
    public List<MouchardStockDTO> getMouchardStock(String dtStart, String dtEnd, int limit, int start, boolean all) {
        return fetchMouchard(dtStart, dtEnd, limit, start, all).stream().map(this::build).collect(Collectors.toList());

    }

    private int getCount(String dtStart, String dtEnd) {

        LOG.log(Level.INFO, "sql--- getCount {0}", MVT_QUERY_COUNT);
        try {
            Query query = em.createNativeQuery(MVT_QUERY_COUNT).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd));

            return ((Number) query.getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<Tuple> fetchMouchard(String dtStart, String dtEnd, int limit, int start, boolean all) {
        String sql = MVT_QUERY;
        LOG.log(Level.INFO, "sql---  getMouchards {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd));
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

    private MouchardStockDTO build(Tuple t) {

        return MouchardStockDTO.builder().intCip(t.get("int_CIP", String.class))
                .strName(t.get("str_NAME", String.class)).intPaf(t.get("int_PAF", Integer.class))
                .intPrice(t.get("int_PRICE", Integer.class)).qteDebut(t.get("qteDebut", Integer.class))
                .qteMvt(t.get("qteMvt", Integer.class)).qteFinale(t.get("qteFinale", Integer.class))
                .dtCreated(t.get("createdAt", Timestamp.class).toLocalDateTime().format(formatter))
                .mvType(t.get("description", String.class)).lgUserId(t.get("str_FIRST_NAME", String.class)).build();

    }

}