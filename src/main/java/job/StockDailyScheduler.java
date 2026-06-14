
package job;

import java.time.LocalDate;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import rest.service.impl.DailyStockService;
import config.AppConfig;

/**
 *
 * @author koben
 */
@Singleton
public class StockDailyScheduler {

    @Inject
    private DailyStockService dailyStockService;

    @Inject
    private AppConfig appConfig;

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void runOnStartup() {
        dailyStockService.processAsync(LocalDate.now());
    }

    @Schedule(hour = "0", minute = "5", second = "0", persistent = false)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        // Genere le snapshot par produit (stock_snapshot.stock_journalier, avec qtyReserve) chaque jour, sans dependre
        // d'un redemarrage du serveur. processAsync est garde par isEnabled() (KEY_VALORISATION_JOURNALIERE).
        dailyStockService.processAsync(LocalDate.now());
        dailyStockService.updateStockDailyValueAsync();
    }

}
