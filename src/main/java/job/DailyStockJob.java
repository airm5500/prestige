/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.time.LocalDate;
import javax.annotation.Resource;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.TransactionManagement;
import javax.ejb.TransactionManagementType;
import javax.enterprise.concurrent.ManagedExecutorService;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.UserTransaction;
import shedule.DailyStockTask;

/**
 *
 * @author koben
 */
@Singleton
@Startup
@TransactionManagement(value = TransactionManagementType.BEAN)
public class DailyStockJob {

    @Resource(mappedName = "jdbc/__laborex_pool")
    private DataSource dataSource;
    @Resource(name = "concurrent/__defaultManagedExecutorService")
    ManagedExecutorService mes;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Inject
    private UserTransaction userTransaction;

    @Schedule(hour = "12,18")
    public void execute() throws InterruptedException {
        DailyStockTask dailyStockTask = new DailyStockTask();
        dailyStockTask.setDateStock(LocalDate.now());
        dailyStockTask.setEntityManager(em);
        dailyStockTask.setUserTransaction(userTransaction);
        dailyStockTask.setDataSource(dataSource);
        mes.submit(dailyStockTask);
    }
}
