package job;

import config.AppConfig;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import rest.service.SmsService;
import rest.service.impl.OrdonnanceRenouvellementService;

/**
 * Rappel SMS des RENOUVELLEMENTS d'ordonnance (retour du 30/09), une fois par jour, sur le poste serveur seulement.
 *
 * <p>
 * Les notifications sont preparees dans leur propre transaction (validee au retour du service), puis envoyees par le
 * module SMS existant, comme les campagnes clients. Desactivable par le parametre KEY_SMS_RAPPEL_RENOUVELLEMENT.
 */
@Singleton
public class RappelRenouvellementScheduler {

    private static final Logger LOG = Logger.getLogger(RappelRenouvellementScheduler.class.getName());

    @Inject
    private AppConfig appConfig;

    @EJB
    private OrdonnanceRenouvellementService renouvellements;

    @EJB
    private SmsService smsService;

    @Schedule(hour = "10", minute = "7", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            List<String> ids = renouvellements.preparerRappelsDuJour();
            for (String id : ids) {
                smsService.sendSMSByNotificationIdAsync(id);
            }
            LOG.log(Level.INFO, "Rappels de renouvellement d''ordonnance : {0} SMS", ids.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rappels de renouvellement d'ordonnance", e);
        }
    }
}
