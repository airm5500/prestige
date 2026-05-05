/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service.impl;

import commonTasks.dto.AddLot;
import dal.TFamille;
import dal.TLot;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import org.json.JSONObject;
import rest.service.LotService;
import rest.service.SessionHelperService;
import rest.service.dto.LotDTO;
import util.Constant;
import util.DateCommonUtils;
import util.FunctionUtils;

/**
 *
 * @author Hermann N'ZI
 */
@Stateless
public class LotServiceImpl implements LotService {

    @EJB
    private SessionHelperService sessionHelperService;
    private static final Logger LOG = Logger.getLogger(LotServiceImpl.class.getName());
    private static final String MVT_QUERY = "SELECT f.int_CIP, f.str_NAME, f.int_PAF, f.int_PRICE,g.str_LIBELLE, l.int_NUM_LOT, l.str_REF_LIVRAISON,l.int_NUMBER, l.int_NUMBER_GRATUIT,\n"
            + "l.dt_SORTIE_USINE, l.dt_PEREMPTION\n" + "FROM t_lot l, t_famille f, t_grossiste g\n"
            + "WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID AND DATE(l.dt_CREATED) BETWEEN ?1 AND ?2";

    private static final String MVT_QUERY2 = "SELECT f.int_CIP, f.str_NAME, f.int_PAF, f.int_PRICE,g.str_LIBELLE, l.int_NUM_LOT, l.str_REF_LIVRAISON,l.int_NUMBER, l.int_NUMBER_GRATUIT,\n"
            + "l.dt_SORTIE_USINE, l.dt_PEREMPTION\n" + "FROM t_lot l, t_famille f, t_grossiste g\n"
            + "WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID";

    private static final String MVT_QUERY_COUNT = "SELECT COUNT(l.lg_LOT_ID) FROM t_lot l WHERE DATE(l.dt_CREATED) BETWEEN ?1 AND ?2 ";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private final String pattern = "dd/MM/YYYY";
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);

    @Override
    // appEler dans la ressource
    public JSONObject getAllLots(String dtStart, String dtEnd, int limit, int start) {
        int total = getCount(dtStart, dtEnd);
        return FunctionUtils.returnData(this.getAllLots(dtStart, dtEnd, limit, start, true), total);
    }

    @Override
    public List<LotDTO> getAllLots(String dtStart, String dtEnd, int limit, int start, boolean all) {
        return fetchAllLots(dtStart, dtEnd, limit, start, all).stream().map(this::build).collect(Collectors.toList());

    }

    private List<Tuple> fetchAllLots(String dtStart, String dtEnd, int limit, int start, boolean all) {
        String sql = MVT_QUERY;
        LOG.log(Level.INFO, "sql---  getAllLots {0}", sql);
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

    private List<Tuple> fetchLots() {
        String sql = MVT_QUERY2;
        LOG.log(Level.INFO, "sql---  getAllLots {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class);

            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
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

    private LotDTO build(Tuple t) {

        var dtPeremptionTuple = t.get("dt_PEREMPTION", Timestamp.class);
        String dtPeremption = null;
        if (Objects.nonNull(dtPeremptionTuple)) {
            dtPeremption = dtPeremptionTuple.toLocalDateTime().format(formatter);
        }
        return rest.service.dto.LotDTO.builder()
                // .lgFamilleId(t.get("lg_FAMILLE_ID", String.class))
                .intCip(t.get("int_CIP", String.class)).strName(t.get("str_NAME", String.class))
                .intPaf(t.get("int_PAF", Integer.class)).intPrice(t.get("int_PRICE", Integer.class))
                .lgGrossisteId(t.get("str_LIBELLE", String.class)).intNumLot(t.get("int_NUM_LOT", String.class))
                .strRefLivraison(t.get("str_REF_LIVRAISON", String.class)).intNumber(t.get("int_NUMBER", Integer.class))
                .intNumberGratuit(t.get("int_NUMBER_GRATUIT", Integer.class))
                .dtSortieUsine(t.get("dt_SORTIE_USINE", Timestamp.class).toLocalDateTime().format(formatter))
                .dtPeremption(dtPeremption)
                // .dtCreated(t.get("dt_CREATED", Timestamp.class).toLocalDateTime().format(formatter))
                // .dtUpdated(t.get("dt_UPDATED", Timestamp.class).toLocalDateTime().format(formatter))
                // .intQtyVendue(t.get("int_QTY_VENDUE", Integer.class))
                // .lgUserId(t.get("lg_USER_ID", String.class))
                .build();
        /*
         * .heureOpreration(t.get("heureOpreration", String.class)) .dateOpreration(t.get("dateOpreration",
         * java.sql.Date.class).toLocalDate() .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).build();
         */
    }

    @Override
    public JSONObject getAllLots() {

        return FunctionUtils.returnData(this.fetchLots().stream().map(this::build).collect(Collectors.toList()));
    }

    @Override
    public void pickLot(String produitId, int quantiteVendue) {
        if (quantiteVendue == 0) {
            return;
        }
        List<TLot> lots = findOnlyAvaillableStockByProduitId(produitId, quantiteVendue < 0);
        int remaining = quantiteVendue;

        for (var lot : lots) {

            if (quantiteVendue == 0) {
                break;
            }

            int take = Math.min(remaining, lot.getCurrentStock());

            lot.setCurrentStock(lot.getCurrentStock() - take);

            lot.setDtUPDATED(new Date());
            lot.setLgUSERID(sessionHelperService.getCurrentUser());
            em.merge(lot);
            quantiteVendue -= take;

        }

        // TODO 1 mettre le stock
    }

    private List<TLot> findOnlyAvaillableStockByProduitId(String produitId, boolean checkedLotSansStock) {

        try {
            TypedQuery<TLot> tq = checkedLotSansStock ? em.createNamedQuery("TLot.findByProduitId", TLot.class)
                    : em.createNamedQuery("TLot.findOnlyAvaillableStockByProduitId", TLot.class);
            tq.setParameter("lgFAMILLEID", produitId);
            tq.setParameter("datePeremtion", java.sql.Timestamp.valueOf(LocalDateTime.now()), TemporalType.TIMESTAMP);
            return tq.getResultList();
        } catch (Exception e) {
            LOG.log(Level.INFO, null, e);
            return new ArrayList<>();
        }
    }

    @Override
    public void addLot(AddLot addLot) {
        TFamille famille = em.find(TFamille.class, addLot.getProduitId());
        TLot lot = new TLot(UUID.randomUUID().toString());
        lot.setDtCREATED(new Date());
        lot.setIntNUMBER(addLot.getQuantity());
        lot.setIntNUMBERGRATUIT(0);
        lot.setIntQTYVENDUE(0);
        lot.setIntNUMLOT(addLot.getNumLot());
        lot.setDtUPDATED(lot.getDtCREATED());
        lot.setLgFAMILLEID(famille);
        lot.setLgGROSSISTEID(famille.getLgGROSSISTEID());
        lot.setDtPEREMPTION(DateCommonUtils.convertLocalDateToDate(LocalDate.parse(addLot.getDatePeremption())));
        lot.setLgUSERID(sessionHelperService.getCurrentUser());
        lot.setStrSTATUT(Constant.STATUT_ENABLE);
        lot.setDtSORTIEUSINE(lot.getDtCREATED());
        lot.setCurrentStock(addLot.getQuantity());
        em.persist(lot);
    }
}
