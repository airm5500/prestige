package job;

import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import config.AppConfig;

/**
 *
 * @author koben
 */
@Singleton
public class NotificationScheduler {

    @Inject
    private NotificationScheduledService notificationScheduledService;

    @Inject
    private AppConfig appConfig;

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void runSmsOnStartup() {
        notificationScheduledService.sendPendingSmsAsync();
    }

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void runEmailOnStartup() {
        notificationScheduledService.sendPendingEmailsAsync();
    }

    @Schedule(hour = "9,13,17,21", minute = "20", second = "0", persistent = false)
    public void smsJob() {
        if (!appConfig.isServerMode()) {
            return;
        }
        notificationScheduledService.sendPendingSmsAsync();
    }

    @Schedule(hour = "9,12,17", minute = "0", second = "0", persistent = false)
    public void emailJob() {
        if (!appConfig.isServerMode()) {
            return;
        }
        notificationScheduledService.sendPendingEmailsAsync();
    }
}
