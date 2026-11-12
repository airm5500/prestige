package job;

import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import rest.service.impl.sauvegarde.HorairesSauvegarde;
import rest.service.impl.sauvegarde.SauvegardeService;

/**
 * Sauvegarde de la base aux horaires de KEY_SAUVEGARDE_HORAIRES (vide : toutes les heures a hh:05, retour du 01/11),
 * sur le serveur seulement (retour du 12/11), puis controle de fraicheur une fois par heure. KEY_SAUVEGARDE_ACTIVE = 0
 * coupe la sauvegarde automatique (la sauvegarde manuelle reste possible sur le serveur).
 */
@Singleton
public class SauvegardeScheduler {

    private static final Logger LOG = Logger.getLogger(SauvegardeScheduler.class.getName());

    @EJB
    private SauvegardeService sauvegardeService;

    @Schedule(hour = "*", minute = "*/5", second = "0", persistent = false)
    public void sauvegarder() {
        try {
            LocalDateTime passage = LocalDateTime.now();
            sauvegardeService.automatique(passage);
            if (passage.getMinute() / HorairesSauvegarde.PAS_MINUTES == HorairesSauvegarde.MINUTE_HORAIRE
                    / HorairesSauvegarde.PAS_MINUTES) {
                sauvegardeService.verifierFraicheur(ManagementFactory.getRuntimeMXBean().getStartTime(), passage);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Sauvegarde automatique", e);
        }
    }
}
