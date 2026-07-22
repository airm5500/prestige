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

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private final String pattern = "dd/MM/YYYY";
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);

    private static final String GRID_SELECT = "SELECT l.lg_LOT_ID AS c_lot_id, f.int_CIP AS c_cip, "
            + "f.str_NAME AS c_libelle, l.int_NUM_LOT AS c_numlot, l.str_REF_LIVRAISON AS c_refbl, "
            + "l.str_REF_ORDER AS c_refcmde, l.int_NUMBER AS c_number, l.int_NUMBER_GRATUIT AS c_numbergt, "
            + "g.str_LIBELLE AS c_grossiste, l.dt_CREATED AS c_datesortie, l.dt_PEREMPTION AS c_dateperemption, "
            + "te.str_NAME AS c_etiquette " + "FROM t_lot l " + "JOIN t_famille f ON l.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
            + "LEFT JOIN t_grossiste g ON l.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID "
            + "LEFT JOIN t_typeetiquette te ON l.lg_TYPEETIQUETTE_ID = te.lg_TYPEETIQUETTE_ID "
            + "WHERE l.dt_CREATED >= ?1 AND l.dt_CREATED < ?2 ";

    private static final String GRID_COUNT = "SELECT COUNT(l.lg_LOT_ID) FROM t_lot l "
            + "JOIN t_famille f ON l.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
            + "WHERE l.dt_CREATED >= ?1 AND l.dt_CREATED < ?2 ";

    private static final String GRID_SEARCH_CLAUSE = "AND (f.str_NAME LIKE ?3 OR f.int_CIP LIKE ?3 "
            + "OR l.str_REF_LIVRAISON LIKE ?3 OR l.str_REF_ORDER LIKE ?3) ";

    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Override
    // appEler dans la ressource
    public JSONObject getAllLots(String dtStart, String dtEnd, String searchValue, int start, int limit) {
        LocalDate startDate = (dtStart == null || dtStart.isEmpty()) ? LocalDate.now() : LocalDate.parse(dtStart);
        LocalDate endDate = (dtEnd == null || dtEnd.isEmpty()) ? LocalDate.now() : LocalDate.parse(dtEnd);
        java.sql.Date pStart = java.sql.Date.valueOf(startDate);
        java.sql.Date pEnd = java.sql.Date.valueOf(endDate.plusDays(1));

        String search = (searchValue == null) ? "" : searchValue.trim();
        boolean hasSearch = !search.isEmpty();
        String searchLike = search + "%";

        long total = countLotsForGrid(pStart, pEnd, hasSearch, searchLike);
        org.json.JSONArray data = fetchLotsForGrid(pStart, pEnd, hasSearch, searchLike, start, limit);
        return new JSONObject().put("total", total).put("data", data);
    }

    private long countLotsForGrid(java.sql.Date pStart, java.sql.Date pEnd, boolean hasSearch, String searchLike) {
        try {
            String sql = hasSearch ? GRID_COUNT + GRID_SEARCH_CLAUSE : GRID_COUNT;
            Query query = em.createNativeQuery(sql).setParameter(1, pStart).setParameter(2, pEnd);
            if (hasSearch) {
                query.setParameter(3, searchLike);
            }
            return ((Number) query.getSingleResult()).longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private org.json.JSONArray fetchLotsForGrid(java.sql.Date pStart, java.sql.Date pEnd, boolean hasSearch,
            String searchLike, int start, int limit) {
        org.json.JSONArray array = new org.json.JSONArray();
        try {
            String sql = (hasSearch ? GRID_SELECT + GRID_SEARCH_CLAUSE : GRID_SELECT) + "ORDER BY l.dt_CREATED DESC";
            Query query = em.createNativeQuery(sql).setParameter(1, pStart).setParameter(2, pEnd);
            if (hasSearch) {
                query.setParameter(3, searchLike);
            }
            if (limit > 0) {
                query.setFirstResult(start);
                query.setMaxResults(limit);
            }
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] r : rows) {
                int number = toInt(r[6]);
                int gratuit = toInt(r[7]);
                JSONObject json = new JSONObject();
                json.put("lg_LOT_ID", toStr(r[0]));
                json.put("CIP", toStr(r[1]));
                json.put("LIBELLE", toStr(r[2]));
                json.put("NUMLOT", toStr(r[3]));
                json.put("REFBL", toStr(r[4]));
                json.put("REFCMDE", toStr(r[5]));
                json.put("NUMBER", number - gratuit);
                json.put("NUMBERGT", gratuit);
                json.put("GROSSISTE", toStr(r[8]));
                json.put("DATESORTIE", formatDate(r[9]));
                json.put("DATEPEREMPTION", formatDate(r[10]));
                json.put("ETIQUETTE", toStr(r[11]));
                array.put(json);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return array;
    }

    private static int toInt(Object o) {
        return (o instanceof Number) ? ((Number) o).intValue() : 0;
    }

    private static String toStr(Object o) {
        return (o == null) ? "" : String.valueOf(o);
    }

    private static String formatDate(Object o) {
        if (o instanceof java.util.Date) {
            return new Timestamp(((java.util.Date) o).getTime()).toLocalDateTime().format(DISPLAY_FORMAT);
        }
        return "";
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
        int remaining = decrementerLots(findOnlyAvaillableStockByProduitId(produitId, quantiteVendue < 0),
                quantiteVendue);
        // Les unites encore non imputees proviennent physiquement de lots deja
        // perimes : on les decremente aussi, sinon leur current_stock fantome
        // les laisse indefiniment dans la visualisation des perimes alors que
        // tout a ete vendu.
        if (remaining > 0) {
            decrementerLots(findExpiredLotsWithStock(produitId), remaining);
        }
    }

    private int decrementerLots(List<TLot> lots, int quantite) {
        int remaining = quantite;
        for (var lot : lots) {

            if (remaining == 0) {
                break;
            }

            int take = Math.min(remaining, lot.getCurrentStock());

            lot.setCurrentStock(lot.getCurrentStock() - take);

            lot.setDtUPDATED(new Date());
            lot.setLgUSERID(sessionHelperService.getCurrentUser());
            em.merge(lot);
            remaining -= take;

        }
        return remaining;
    }

    private List<TLot> findExpiredLotsWithStock(String produitId) {
        try {
            return em
                    .createQuery("SELECT t FROM TLot t WHERE t.currentStock > 0 AND t.lgFAMILLEID.lgFAMILLEID = ?1"
                            + " AND t.dtPEREMPTION IS NOT NULL AND t.intNUMLOT IS NOT NULL AND t.dtPEREMPTION <= ?2"
                            + " ORDER BY t.dtPEREMPTION ASC", TLot.class)
                    .setParameter(1, produitId)
                    .setParameter(2, java.sql.Timestamp.valueOf(LocalDateTime.now()), TemporalType.TIMESTAMP)
                    .getResultList();
        } catch (Exception e) {
            LOG.log(Level.INFO, null, e);
            return new ArrayList<>();
        }
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
