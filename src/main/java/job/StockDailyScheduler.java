
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
        // Rattrapage : ne releve la journee que si le declenchement de 00:05 n'a pas eu lieu (serveur eteint cette
        // nuit-la). Si elle a deja ete relevee, on ne la reecrit pas : un redemarrage a 15 h remplacerait le stock a
        // la cloture de la veille par un stock de milieu de journee.
        dailyStockService.processAsync(LocalDate.now(), true);
        // La valorisation n'etait relancee que par le declenchement de 00:05. Dans une officine qui eteint le serveur
        // la nuit, cette heure n'arrive jamais : stock_daily_value restait vide et le Centre de Support signalait
        // « valorisation quotidienne en retard » sans que rien ne puisse jamais la rattraper. Le traitement n'ecrit
        // que les journees manquantes (les quatre dernieres), il est donc sans effet quand la nuit s'est bien passee.
        dailyStockService.updateStockDailyValueOnStartup();
    }

    @Schedule(hour = "0", minute = "5", second = "0", persistent = false)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        // Genere le snapshot par produit (stock_snapshot_day et, le temps de la periode de securite,
        // stock_snapshot.stock_journalier) chaque jour, sans dependre d'un redemarrage du serveur. processAsync est
        // garde par isEnabled() (KEY_VALORISATION_JOURNALIERE).
        dailyStockService.processAsync(LocalDate.now(), false);
        dailyStockService.updateStockDailyValueAsync();
    }

}
