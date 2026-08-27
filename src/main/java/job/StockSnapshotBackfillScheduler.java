package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import config.AppConfig;
import rest.service.impl.ReserveHistoriqueService;
import rest.service.impl.StockSnapshotBackfillService;

/**
 * Declenche la reprise de l'historique JSON vers stock_snapshot_day, de nuit et hors des heures d'ouverture.
 *
 * <p>
 * 01:30 : apres le releve quotidien de 00:05, avant la purge du Centre de Support de 03:45. La reprise memorise sa
 * progression et se declare terminee une fois l'historique repris ; les declenchements suivants ne font plus rien. Elle
 * peut donc rester planifiee sans precaution.
 * </p>
 *
 * @author koben
 */
@Singleton
public class StockSnapshotBackfillScheduler {

    private static final Logger LOG = Logger.getLogger(StockSnapshotBackfillScheduler.class.getName());

    @Inject
    private StockSnapshotBackfillService backfillService;

    @Inject
    private ReserveHistoriqueService reserveHistoriqueService;

    @Inject
    private AppConfig appConfig;

    @Schedule(hour = "1", minute = "30", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            // Assainissement d'abord : il remet a zero la reserve des journees anterieures a son activation, y compris
            // sur les journees deja ecrites par l'ancien vidage. La reprise qui suit reecrit ces memes journees depuis
            // l'archive relationnelle ; faire l'inverse laisserait la fausse reserve visible jusqu'a la nuit suivante.
            reserveHistoriqueService.assainir();
            backfillService.executerAsync();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Declenchement de la reprise historique", e);
        }
    }
}
