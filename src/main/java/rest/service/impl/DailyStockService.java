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
import javax.ejb.EJB;
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

    @EJB
    private DailyStockService self;

    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void processAsync(LocalDate dateStock) {
        try {

            if (!isEnabled()) {
                LOG.info("Daily stock disabled.");
                return;
            }

            LocalDateTime start = LocalDateTime.now();
            LOG.log(Level.INFO, "Daily stock started at {0}", start);

            // Appels via self pour que les @TransactionAttribute soient appliqués par le proxy EJB
            self.callProcedure();
            self.updateStock(dateStock);
            self.migrateSnapshots();

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

    /**
     * Orchestrateur sans transaction : délègue chaque batch à processStockBatch() via le proxy EJB pour que chaque
     * batch ouvre et committe sa propre transaction.
     *
     * @param dateStock
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void updateStock(LocalDate dateStock) {

        int dateAsInt = Integer.parseInt(dateStock.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        int offset = 0;
        int processed;

        do {
            processed = self.processStockBatch(dateAsInt, offset);
            offset += processed;
            LOG.log(Level.INFO, "Batch flush at offset {0}", offset);
        } while (processed == BATCH_SIZE);

        LOG.log(Level.INFO, "Fin execution du batch {0}", LocalDateTime.now());
    }

    /**
     * Charge et traite un batch dans une transaction courte dédiée. Le fetch et le traitement sont dans la même
     * transaction pour permettre le chargement des relations LAZY (lgFAMILLEID, etc.).
     *
     * @param dateAsInt
     * @param offset
     *
     * @return nombre d'éléments traités
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int processStockBatch(int dateAsInt, int offset) {

        List<TFamilleStock> batch = em
                .createNamedQuery("TFamilleStock.findFamilleStockByEmplacement", TFamilleStock.class)
                .setParameter("lgEMPLACEMENTID", Constant.OFFICINE).setFirstResult(offset).setMaxResults(BATCH_SIZE)
                .getResultList();

        for (TFamilleStock next : batch) {

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
        }

        em.flush();
        em.clear();
        return batch.size();
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

    /**
     * Orchestrateur sans transaction : délègue chaque batch à migrateSnapshotBatch() via le proxy EJB.
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void migrateSnapshots() {
        while (self.migrateSnapshotBatch()) {
            // continue jusqu'à ce qu'il n'y ait plus rien à migrer
        }
    }

    /**
     * Migre un batch de TStockSnapshot dans une transaction courte dédiée.
     *
     * @return true s'il reste des enregistrements à migrer, false sinon
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public boolean migrateSnapshotBatch() {

        List<TStockSnapshot> list = em.createNamedQuery("TStockSnapshot.findAll", TStockSnapshot.class)
                .setMaxResults(BATCH_SIZE).getResultList();

        if (list.isEmpty()) {
            return false;
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
        return true;
    }

    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
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
                self.persistStockDailyValue(id);
            }
        }
        LOG.info("Stock daily value update finished");
    }

    private boolean isAlreadyUpdated(int day) {
        StockDailyValue sdv = em.find(StockDailyValue.class, day);
        return sdv != null;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void persistStockDailyValue(int id) {
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
