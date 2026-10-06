package job;

import config.AppConfig;
import java.time.LocalDate;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import rest.service.RappelHabitudeService;
import rest.service.SmsService;

/**
 * Rappels de traitement habituel (plan d'octobre, section 4.1), une fois par jour, sur le poste serveur seulement : la
 * liste « à préparer » est recalculee ; les SMS ne partent automatiquement que si KEY_RAPPEL_HABITUDE_ACTIF vaut 1.
 */
@Singleton
public class RappelHabitudeScheduler {

    private static final Logger LOG = Logger.getLogger(RappelHabitudeScheduler.class.getName());

    @Inject
    private AppConfig appConfig;

    @EJB
    private RappelHabitudeService rappels;

    @EJB
    private SmsService smsService;

    @Schedule(hour = "7", minute = "13", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            List<String> ids = rappels.rappelsAutomatiques(LocalDate.now());
            for (String id : ids) {
                smsService.sendSMSByNotificationIdAsync(id);
            }
            LOG.log(Level.INFO, "Rappels de traitement habituel : {0} SMS", ids.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rappels de traitement habituel", e);
        }
    }
}
