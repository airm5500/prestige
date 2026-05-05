/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.time.LocalDate;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.inject.Inject;
import rest.service.impl.DailyStockService;

/**
 *
 * @author koben
 */
@Singleton
@Startup
public class DailyStockJob {

    @Inject
    private DailyStockService service;

    @Lock(LockType.WRITE)
    @Schedule(hour = "12,18", minute = "0", second = "0", persistent = false)
    // @Schedule(hour = "*", minute = "*/5", persistent = false)
    public void execute() throws InterruptedException {
        service.processAsync(LocalDate.now());
    }
}
