
package rest.service.notification.template;

import commonTasks.dto.NotificationDTO;
import dal.Notification;
import dal.TUser;
import java.util.Objects;
import rest.service.v2.dto.NotificationUtilsDTO;

/**
 *
 * @author koben
 */
public class Sms {

    public static String buildClotureCaisse(Notification notification) {
        if (Objects.isNull(notification)) {
            return null;
        }
        NotificationDTO notificationDTO = new NotificationDTO(notification);
        NotificationUtilsDTO notificationDetail = notificationDTO.getNotificationDetail();
        TUser user = notification.getUser();
        return String.format("Cloture de la caisse de  %s %s avec succès avec un montant de: %s à la date du %s",
                user.getStrFIRSTNAME(), user.getStrLASTNAME(), notificationDetail.getMontant(),
                notificationDetail.getDateMvt());

    }

    public static String buildClotureCaisse(String montant, TUser user, String date) {

        return String.format("Cloture de la caisse de  %s %s avec succès avec un montant de: %s à la date du %s",
                user.getStrFIRSTNAME(), user.getStrLASTNAME(), montant, date);

    }
}
