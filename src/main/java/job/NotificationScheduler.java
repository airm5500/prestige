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

/**
 *
 * @author koben
 */
@Singleton
@Startup
public class NotificationScheduler {

    @Inject
    private NotificationScheduledService notificationScheduledService;

    @PostConstruct
    public void init() {
        notificationScheduledService.sendPendingSmsAsync();
        notificationScheduledService.sendPendingEmailsAsync();
    }

    @Schedule(hour = "9,13,17,21", minute = "20", second = "0", persistent = false)
    public void smsJob() {
        notificationScheduledService.sendPendingSmsAsync();
    }

    @Schedule(hour = "9,12,17", minute = "0", second = "0", persistent = false)
    public void emailJob() {
        notificationScheduledService.sendPendingEmailsAsync();
    }
}
