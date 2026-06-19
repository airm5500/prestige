package job;

import config.AppConfig;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import rest.service.AbcAnalysisService;

/**
 * Reclassification ABC automatique.
 *
 * Le timer tourne tous les jours, mais le traitement reel n'a lieu qu'une fois
 * par mois grace au parametre ABC_LAST_RECLASS_DATE (gere dans
 * {@link AbcAnalysisService#autoReclassifyIfDue()}). Cette approche est robuste :
 * si le serveur est eteint le 1er du mois, le rattrapage se fait au prochain
 * passage du timer.
 *
 * Desactivable via le parametre ABC_AUTO_RECLASS = 0.
 */
@Singleton
public class AbcReclassScheduler {

    private static final Logger LOG = Logger.getLogger(AbcReclassScheduler.class.getName());

    @EJB
    private AbcAnalysisService abcAnalysisService;

    @Inject
    private AppConfig appConfig;

    @Schedule(hour = "2", minute = "30", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            abcAnalysisService.autoReclassifyIfDue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Reclassification ABC automatique en echec", e);
        }
    }
}
