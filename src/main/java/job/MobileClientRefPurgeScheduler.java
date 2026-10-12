package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import rest.service.mobile.MobileClientRefService;

/**
 * Prestige Mobile H4 : chaque nuit, les cles client (X-Client-Ref) de plus de 90 jours sont supprimees de
 * mobile_client_ref (elles ne servent qu'a reprendre un envoi dont la reponse a ete perdue).
 */
@Singleton
public class MobileClientRefPurgeScheduler {

    private static final Logger LOG = Logger.getLogger(MobileClientRefPurgeScheduler.class.getName());

    @EJB
    private MobileClientRefService service;

    @Schedule(hour = "3", minute = "33", second = "0", persistent = false)
    public void purger() {
        try {
            int n = service.purger();
            if (n > 0) {
                LOG.log(Level.INFO, "Cles client mobiles purgees : {0}", n);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Purge des cles client mobiles", e);
        }
    }
}
