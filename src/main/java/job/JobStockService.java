/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import static org.quartz.JobBuilder.newJob;
import org.quartz.JobDetail;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import static org.quartz.SimpleScheduleBuilder.simpleSchedule;
import org.quartz.Trigger;
import static org.quartz.TriggerBuilder.newTrigger;
import org.quartz.impl.StdSchedulerFactory;

/**
 *
 * @author KKOFFI
 */
public class JobStockService {
    private static final Logger LOG = Logger.getLogger(JobStockService.class.getName());

    // cette fonction met à jour les produits perimes

    public void executeJobLot() {
        Scheduler scheduler;
        try {
            scheduler = StdSchedulerFactory.getDefaultScheduler();
            JobDetail job = newJob(JobLot.class).withIdentity("joblot", "lotjob").build();
            Trigger trigger = newTrigger().withIdentity("triggerjjoblot", "lotjob").startNow()
                    .withSchedule(simpleSchedule().withIntervalInHours(1).repeatForever()).build();
            scheduler.start();
            scheduler.scheduleJob(job, trigger);
        } catch (SchedulerException e) {
            LOG.log(Level.SEVERE, "executeJobLot", e);
        }
    }

}
