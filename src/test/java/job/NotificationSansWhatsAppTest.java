package job;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dal.Notification;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 11 : une notification deja confiee a WhatsApp (avoir, campagne, rappel) n'est pas renvoyee par
 * SMS par le job planifie. Avant, elle restait « NOT_SEND » et repartait par SMS. Le repli SMS, notification a part,
 * reste envoye.
 */
class NotificationSansWhatsAppTest {

    private static Notification n(String id) {
        Notification n = new Notification();
        n.setId(id);
        return n;
    }

    @Test
    void ecarteSeulementLesNotificationsPartiesParWhatsApp() {
        Random r = new Random(20261122L);
        for (int k = 0; k < 2_000; k++) {
            int taille = r.nextInt(30);
            List<Notification> l = new ArrayList<>();
            Set<String> wa = new HashSet<>();
            for (int i = 0; i < taille; i++) {
                String id = "N" + k + "-" + i;
                l.add(n(id));
                if (r.nextInt(3) == 0) {
                    wa.add(id);
                }
            }
            /* identifiants WhatsApp etrangers a la liste (autres jours, autres notifications) : sans effet */
            wa.add("AUTRE-" + k);
            List<Notification> reste = NotificationScheduledService.sansWhatsApp(l, wa);
            List<String> attendu = l.stream().map(Notification::getId).filter(id -> !wa.contains(id))
                    .collect(Collectors.toList());
            assertEquals(attendu, reste.stream().map(Notification::getId).collect(Collectors.toList()), "jeu " + k);
            /* ni perte ni doublon : envoyees par SMS + parties par WhatsApp = liste */
            long parWa = l.stream().filter(x -> wa.contains(x.getId())).count();
            assertEquals(l.size(), reste.size() + parWa, "jeu " + k);
        }
    }

    @Test
    void sansWhatsAppRienNEstEcarte() {
        List<Notification> l = new ArrayList<>();
        l.add(n("A"));
        l.add(n("B"));
        assertEquals(2, NotificationScheduledService.sansWhatsApp(l, new HashSet<>()).size());
    }
}
