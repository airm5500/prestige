package job;

import java.util.concurrent.TimeUnit;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.enterprise.concurrent.ManagedScheduledExecutorService;
import rest.service.StockReapproService;

/**
 *
 * @author koben
 */
@Singleton
public class StockReapproJob {

    @Resource(name = "concurrent/__defaultManagedScheduledExecutorService")
    private ManagedScheduledExecutorService scheduledExecutorService;

    @EJB
    private StockReapproService stockReapproService;

    @EJB
    private config.AppConfig appConfig;

    @PostConstruct
    public void init() {
        // initialDelay = 1 day : l'exécution au démarrage est déléguée à StartupOrchestrationService
        scheduledExecutorService.scheduleAtFixedRate(this::execute, 1, 1, TimeUnit.DAYS);
    }

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void runOnStartup() {
        if (appConfig.isServerMode() && appConfig.isDefaultReapproMode()) {
            stockReapproService.execute();
        }
    }

    private void execute() {
        if (appConfig.isServerMode() && appConfig.isDefaultReapproMode()) {
            stockReapproService.execute();
        }
    }

}
