/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package shedule;

import dal.StockSnapshot;
import dal.StockSnapshotValue;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TParameters;
import dal.TStockSnapshot;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.sql.DataSource;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import util.DateConverter;

/**
 *
 * @author koben
 */
public class DailyStockTask implements Runnable {

    private static final Logger LOG = Logger.getLogger(DailyStockTask.class.getName());

    private DataSource dataSource;
    private EntityManager entityManager;
    private UserTransaction userTransaction;
    private LocalDate dateStock;

    @Override
    public void run() {
        try (Connection con = dataSource.getConnection()) {
            boolean canContinue = false;
            try (Statement s = con.createStatement(); ResultSet rs = s
                    .executeQuery("SELECT o.* FROM t_parameters o WHERE str_KEY='KEY_VALORISATION_JOURNALIERE'")) {
                while (rs.next()) {
                    canContinue = Integer.parseInt(rs.getString("str_VALUE").trim()) == 1;
                    break;
                }
            }
            LOG.log(Level.INFO, "canContinuet {0}", canContinue);
            if (canContinue) {
                LocalDateTime startAt = LocalDateTime.now();
                LOG.log(Level.INFO, "daily stock snapshot begin at {0}",
                        startAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                try (CallableStatement stmt = con.prepareCall("{CALL proc_update_stock_snaps()}")) {
                    stmt.executeUpdate();
                }
                con.close();
                LocalDateTime endAt = LocalDateTime.now();
                LOG.log(Level.INFO, "daily stock snapshot end at {0} ,duration in seconde",
                        new Object[] { endAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                                ChronoUnit.SECONDS.between(startAt, endAt) });
            }
        } catch (SQLException e) {
            e.printStackTrace(System.err);
        }
        // updateStock();
    }

    private boolean findById() {
        try {
            TParameters tp = getEntityManager().find(TParameters.class, "KEY_VALORISATION_JOURNALIERE");
            return Integer.valueOf(tp.getStrVALUE()) == 1;
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return false;
        }
    }

    private StockSnapshot findById(String id) {
        try {
            StockSnapshot snapshot = getEntityManager().find(StockSnapshot.class, id);
            if (snapshot != null) {
                return snapshot;
            }
            return new StockSnapshot().id(id);
        } catch (Exception e) {
            return new StockSnapshot().id(id);
        }
    }

    private List<TStockSnapshot> list(int e) {

        try {
            TypedQuery<TStockSnapshot> q = getEntityManager().createNamedQuery("TStockSnapshot.findAll",
                    TStockSnapshot.class);
            // q.setFirstResult(n);
            q.setMaxResults(e);
            return q.getResultList();
        } catch (Exception ex) {
            ex.printStackTrace(System.err);
            return Collections.emptyList();
        }

    }

    private TFamille newFamile(String id) {
        return new TFamille(id);

    }

    int prixMpd(int stoc, int prixAchat) {
        try {
            if (stoc <= 0) {
                return 0;
            }
            return (stoc * prixAchat) / stoc;
        } catch (Exception e) {
            return 0;
        }
    }

    private void update(List<TStockSnapshot> l) {
        try {
            userTransaction.begin();
            for (TStockSnapshot s : l) {
                TFamille f = newFamile(s.getTStockSnapshotPK().getFamilleId());
                StockSnapshot snapshot = findById(f.getLgFAMILLEID());
                snapshot.setProduit(f);
                snapshot.getStocks().add(new StockSnapshotValue().prixMoyentpondere(prixMpd(s.getQty(), s.getPrixPaf()))
                        .prixPaf(s.getPrixPaf()).prixUni(s.getPrixUni()).qty(s.getQty()).stockOfDay(Integer.valueOf(
                                s.getTStockSnapshotPK().getId().format(DateTimeFormatter.ofPattern("yyyyMMdd")))));
                entityManager.merge(snapshot);
                entityManager.remove(entityManager.merge(s));

            }
            entityManager.flush();
            entityManager.clear();
            userTransaction.commit();

        } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
            Logger.getLogger(DailyStockTask.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void migrerStock() {
        int e = 365;
        List<TStockSnapshot> l;
        Instant start = Instant.now();

        while (true) {
            l = list(e);
            if (l.isEmpty()) {
                break;
            }
            update(l);

        }
    }

    public void updateStock() {
        if (findById()) {
            try {

                final LocalDate dateStock_ = getDateStock();
                int dateAsInt = Integer.valueOf(dateStock_.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
                List<TFamilleStock> list = findAll();
                Iterator<TFamilleStock> iterator = list.iterator();
                userTransaction.begin();
                int i = 0;

                while (iterator.hasNext()) {
                    TFamilleStock next = iterator.next();
                    TFamille famille = next.getLgFAMILLEID();
                    StockSnapshot snapshot = findById(famille.getLgFAMILLEID());
                    snapshot.setProduit(famille);
                    snapshot.getStocks()
                            .add(new StockSnapshotValue().prixMoyentpondere(famille.getDblPRIXMOYENPONDERE().intValue())
                                    .prixPaf(famille.getIntPAF()).prixUni(famille.getIntPRICE())
                                    .qty(next.getIntNUMBERAVAILABLE()).stockOfDay(dateAsInt));
                    entityManager.merge(snapshot);
                    if (i > 0 && i % 50 == 0) {
                        entityManager.flush();
                        entityManager.clear();
                        userTransaction.commit();
                        userTransaction.begin();
                    }

                    i++;

                }
                userTransaction.commit();
                migrerStock();
            } catch (Exception e) {
                e.printStackTrace(System.err);
            }
        }

    }

    private List<TFamilleStock> findAll() {
        try {
            TypedQuery<TFamilleStock> q = getEntityManager()
                    .createNamedQuery("TFamilleStock.findFamilleStockByEmplacement", TFamilleStock.class);
            q.setParameter("lgEMPLACEMENTID", DateConverter.OFFICINE);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public DataSource getDataSource() {
        return dataSource;
    }

    public void setDataSource(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public EntityManager getEntityManager() {
        return entityManager;
    }

    public void setEntityManager(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public UserTransaction getUserTransaction() {
        return userTransaction;
    }

    public void setUserTransaction(UserTransaction userTransaction) {
        this.userTransaction = userTransaction;
    }

    public LocalDate getDateStock() {
        return dateStock;
    }

    public void setDateStock(LocalDate dateStock) {
        this.dateStock = dateStock;
    }

}
