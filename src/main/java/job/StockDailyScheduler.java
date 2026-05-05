/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package job;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.Schedule;
import javax.ejb.ScheduleExpression;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.Timeout;
import javax.ejb.Timer;
import javax.ejb.TimerConfig;
import javax.ejb.TimerService;
import javax.inject.Inject;
import rest.service.impl.DailyStockService;

/**
 *
 * @author koben
 */
@Singleton
@Startup
public class StockDailyScheduler {

    @Inject
    private DailyStockService dailyStockService;

    @PostConstruct
    public void init() {

        // Au demarrage
        dailyStockService.updateStockDailyValueAsync();
    }

    @Schedule(hour = "0", minute = "5", second = "0", persistent = false)
    public void run() {
        dailyStockService.updateStockDailyValueAsync();
    }

}
