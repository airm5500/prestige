package job;

import config.AppConfig;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.inject.Inject;
import rest.service.RhPointageService;

/**
 * Photos de controle des pointages par badge (point 31) : une fois par jour, sur le poste serveur, les photos plus
 * anciennes que KEY_RH_PHOTO_RETENTION_JOURS sont retirees ; les pointages restent.
 */
@Singleton
public class PointagePhotoPurgeScheduler {

    private static final Logger LOG = Logger.getLogger(PointagePhotoPurgeScheduler.class.getName());

    @Inject
    private AppConfig appConfig;

    @EJB
    private RhPointageService pointages;

    @Schedule(hour = "3", minute = "47", second = "0", persistent = false)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            LOG.log(Level.INFO, "Photos de pointage purgees : {0}", pointages.purgerPhotos());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "purge des photos de pointage", e);
        }
    }
}
