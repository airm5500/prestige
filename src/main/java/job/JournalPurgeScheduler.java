package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import rest.service.LogService;

/**
 * Retours du 10/10 (journal) : conservation parametrable du fichier journal. Chaque nuit, les lignes plus anciennes que
 * KEY_JOURNAL_CONSERVATION_MOIS (3 mois au moins) sont supprimees ; 0 (defaut) = tout garder.
 */
@Singleton
public class JournalPurgeScheduler {

    private static final Logger LOG = Logger.getLogger(JournalPurgeScheduler.class.getName());

    @EJB
    private LogService logService;

    @Schedule(hour = "3", minute = "27", second = "0", persistent = false)
    public void purger() {
        try {
            logService.purger();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Purge du journal", e);
        }
    }
}
