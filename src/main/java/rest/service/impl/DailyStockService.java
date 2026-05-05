package rest.service.impl;

import dal.StockDailyValue;
import dal.StockSnapshot;
import dal.StockSnapshotValue;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TParameters;
import dal.TStockSnapshot;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.*;
import javax.ejb.Asynchronous;

import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class DailyStockService {

    private static final Logger LOG = Logger.getLogger(DailyStockService.class.getName());

    private static final int BATCH_SIZE = 50;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Asynchronous
    public void processAsync(LocalDate dateStock) {
        try {

            if (!isEnabled()) {
                LOG.info("Daily stock disabled.");
                return;
            }

            LocalDateTime start = LocalDateTime.now();
            LOG.log(Level.INFO, "Daily stock started at {0}", start);

            callProcedure();
            updateStock(dateStock);
            migrateSnapshots();

            LocalDateTime end = LocalDateTime.now();
            LOG.log(Level.INFO, "Daily stock finished at {0} duration(s): {1}",
                    new Object[] { end, Duration.between(start, end).toSeconds() });

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Daily stock error", e);
        }
    }

    private boolean isEnabled() {
        TParameters p = em.find(TParameters.class, "KEY_VALORISATION_JOURNALIERE");
        return p != null && "1".equals(p.getStrVALUE());
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void callProcedure() {
        em.createNativeQuery("CALL proc_update_stock_snaps()").executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void updateStock(LocalDate dateStock) {

        int dateAsInt = Integer.parseInt(dateStock.format(DateTimeFormatter.ofPattern("yyyyMMdd")));

        List<TFamilleStock> list = em
                .createNamedQuery("TFamilleStock.findFamilleStockByEmplacement", TFamilleStock.class)
                .setParameter("lgEMPLACEMENTID", Constant.OFFICINE).getResultList();

        int i = 0;

        for (TFamilleStock next : list) {

            TFamille famille = next.getLgFAMILLEID();

            StockSnapshot snapshot = em.find(StockSnapshot.class, famille.getLgFAMILLEID());
            if (snapshot == null) {
                snapshot = new StockSnapshot().id(famille.getLgFAMILLEID());
            }

            snapshot.setProduit(famille);
            snapshot.getStocks()
                    .add(new StockSnapshotValue()
                            .prixMoyentpondere(prixMpd(Objects.requireNonNullElse(next.getIntNUMBERAVAILABLE(), 0),
                                    Objects.requireNonNullElse(famille.getIntPAF(), 0)))
                            .prixPaf(famille.getIntPAF()).prixUni(famille.getIntPRICE())
                            .qty(next.getIntNUMBERAVAILABLE()).stockOfDay(dateAsInt));

            em.merge(snapshot);

            if (++i % BATCH_SIZE == 0) {
                em.flush();
                em.clear();
                LOG.log(Level.INFO, "Batch flush at {0}", i);
            }
        }

        em.flush();
        em.clear();
    }

    private int prixMpd(int stoc, int prixAchat) {
        try {
            if (stoc <= 0) {
                return 0;
            }
            return prixAchat;
        } catch (Exception e) {
            return 0;
        }
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void migrateSnapshots() {

        while (true) {

            List<TStockSnapshot> list = em.createNamedQuery("TStockSnapshot.findAll", TStockSnapshot.class)
                    .setMaxResults(BATCH_SIZE).getResultList();

            if (list.isEmpty()) {
                break;
            }

            for (TStockSnapshot s : list) {

                TFamille famille = new TFamille(s.getTStockSnapshotPK().getFamilleId());

                StockSnapshot snapshot = em.find(StockSnapshot.class, famille.getLgFAMILLEID());

                if (snapshot == null) {
                    snapshot = new StockSnapshot().id(famille.getLgFAMILLEID());
                }

                snapshot.setProduit(famille);
                snapshot.getStocks().add(new StockSnapshotValue().prixMoyentpondere(s.getPrixPaf()) // simplifié
                        .prixPaf(s.getPrixPaf()).prixUni(s.getPrixUni()).qty(s.getQty()).stockOfDay(Integer.parseInt(
                                s.getTStockSnapshotPK().getId().format(DateTimeFormatter.ofPattern("yyyyMMdd")))));

                em.merge(snapshot);
                em.remove(em.contains(s) ? s : em.merge(s));
            }

            em.flush();
            em.clear();
        }
    }

    @Asynchronous
    public void updateStockDailyValueAsync() {
        LOG.info("Stock daily value update started");
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.BASIC_ISO_DATE;
        LocalDate today = LocalDate.now();
        List<Integer> ids = List.of(Integer.valueOf(today.format(dateTimeFormatter)),
                Integer.valueOf(today.minusDays(1).format(dateTimeFormatter)),
                Integer.valueOf(today.minusDays(2).format(dateTimeFormatter)),
                Integer.valueOf(today.minusDays(3).format(dateTimeFormatter)));

        for (Integer id : ids) {
            if (!isAlreadyUpdated(id)) {
                updateStock(id);
            }
        }
        LOG.info("Stock daily value update finished");
    }

    private boolean isAlreadyUpdated(int day) {
        StockDailyValue sdv = em.find(StockDailyValue.class, day);
        return sdv != null;
    }

    private void updateStock(int id) {
        List<Tuple> result = em.createNativeQuery("SELECT SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE) AS VALEUR_VENTE, "
                + "SUM(s.int_NUMBER_AVAILABLE * f.int_PAF) AS VALEUR_ACHAT " + "FROM t_famille f, t_famille_stock s "
                + "WHERE s.lg_FAMILLE_ID=f.lg_FAMILLE_ID " + "AND s.lg_EMPLACEMENT_ID='1' "
                + "AND s.int_NUMBER_AVAILABLE>0 " + "AND f.str_STATUT='enable'", Tuple.class).getResultList();

        if (!result.isEmpty()) {
            Tuple t = result.get(0);
            StockDailyValue sdv = new StockDailyValue();
            sdv.setId(id);
            sdv.setValeurVente(t.get(0, BigDecimal.class).longValue());
            sdv.setValeurAchat(t.get(1, BigDecimal.class).longValue());
            em.persist(sdv);
        }
    }
}
