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
            return sansWhatsApp(q.getResultList(), envoyeesParWhatsApp());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /**
     * Plan du 21/11, point 11 : une notification deja confiee a WhatsApp (campagne, rappel, avoir) n'est pas renvoyee
     * par SMS : son repli SMS, s'il y en a un, est une notification a part. Avant, elle restait « NOT_SEND » et partait
     * aussi par SMS au passage suivant.
     */
    static List<Notification> sansWhatsApp(List<Notification> notifications, java.util.Set<String> parWhatsApp) {
        List<Notification> l = new java.util.ArrayList<>();
        for (Notification n : notifications) {
            if (!parWhatsApp.contains(n.getId())) {
                l.add(n);
            }
        }
        return l;
    }

    @SuppressWarnings("unchecked")
    private java.util.Set<String> envoyeesParWhatsApp() {
        return new java.util.HashSet<>(em
                .createNativeQuery("SELECT DISTINCT notification_id FROM whatsapp_message"
                        + " WHERE notification_id IS NOT NULL AND created_at >= CURDATE() - INTERVAL 2 DAY")
                .getResultList());
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
