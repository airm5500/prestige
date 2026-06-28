package job;

import dal.Notification;
import dal.TParameters;
import dal.enumeration.Canal;
import dal.enumeration.Statut;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import rest.service.NotificationService;
import rest.service.SmsService;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class NotificationScheduledService {

    private static final Logger LOG = Logger.getLogger(NotificationScheduledService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Inject
    private NotificationService notificationService;
    @EJB
    private SmsService smsService;

    @Asynchronous
    public void sendPendingEmailsAsync() {
        notificationService.sendMail();
    }

    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void sendPendingSmsAsync() {
        if (checkParameterByKey(Constant.KEY_SMS_CLOTURE_CAISSE)) {
            List<Notification> notifications = findAllByCanal();
            for (Notification notification : notifications) {
                try {
                    // Délégation à SmsService : envoi à TOUS les destinataires,
                    // suivi par client (resourceURL, code d'erreur) et logs unifiés.
                    // Token et persistance gérés de façon centralisée par SmsImpl.
                    smsService.sendSMSById(notification.getId());
                } catch (Exception e) {
                    LOG.log(Level.SEVERE, "", e);
                }

            }

        }

    }

    private List<Notification> findAllByCanal() {
        try {
            TypedQuery<Notification> q = em.createNamedQuery("Notification.findAllByCreatedAtAndStatusAndCanal",
                    Notification.class);
            q.setParameter("createdAt", LocalDateTime.parse(LocalDate.now().minusDays(1).toString() + " " + "00:00",
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            q.setParameter("statut", Statut.NOT_SEND);
            q.setParameter("canal", Canal.SMS);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private boolean checkParameterByKey(String key) {
        try {
            TParameters parameters = em.find(TParameters.class, key);
            return (Integer.parseInt(parameters.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
            return false;
        }
    }

}
