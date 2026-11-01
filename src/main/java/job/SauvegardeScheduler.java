package job;

import java.lang.management.ManagementFactory;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import rest.service.impl.sauvegarde.SauvegardeService;

/**
 * Sauvegarde de la base toutes les heures (retour du 01/11 : une heure de donnees perdue au plus), puis controle de
 * fraicheur : aucune sauvegarde reussie depuis 2 h est signale au Centre de support. KEY_SAUVEGARDE_ACTIVE = 0 coupe la
 * sauvegarde automatique (la sauvegarde manuelle reste possible).
 */
@Singleton
public class SauvegardeScheduler {

    private static final Logger LOG = Logger.getLogger(SauvegardeScheduler.class.getName());

    @EJB
    private SauvegardeService sauvegardeService;

    @Schedule(hour = "*", minute = "5", second = "0", persistent = false)
    public void sauvegarder() {
        try {
            if (sauvegardeService.active()) {
                sauvegardeService.automatique();
            }
            sauvegardeService.verifierFraicheur(ManagementFactory.getRuntimeMXBean().getStartTime());
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Sauvegarde automatique", e);
        }
    }
}
