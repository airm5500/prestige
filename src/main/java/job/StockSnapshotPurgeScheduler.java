package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import org.apache.commons.lang3.StringUtils;
import config.AppConfig;
import rest.service.SupportEventService;
import rest.service.impl.StockSnapshotPurgeService;

/**
 * Purge mensuelle du releve journalier de valorisation.
 *
 * <p>
 * Le 2 de chaque mois a 02:30 : apres le releve de 00:05 et la reprise de 01:30, et surtout apres que la cloture du
 * mois precedent a ete relevee, de sorte que la purge ne puisse jamais supprimer une journee qui vient d'acquerir le
 * statut de cloture.
 * </p>
 *
 * <p>
 * La duree de conservation est lue dans KEY_VALORISATION_RETENTION_JOURS (90 par defaut). Une valeur inferieure a 30
 * est refusee : elle ferait disparaitre l'historique courant des ecrans.
 * </p>
 *
 * @author koben
 */
@Singleton
public class StockSnapshotPurgeScheduler {

    private static final Logger LOG = Logger.getLogger(StockSnapshotPurgeScheduler.class.getName());

    private static final int RETENTION_DEFAUT = 90;

    private static final int RETENTION_MINIMALE = 30;

    @EJB
    private StockSnapshotPurgeService purgeService;

    @EJB
    private SupportEventService supportEventService;

    @Inject
    private AppConfig appConfig;

    @Schedule(dayOfMonth = "2", hour = "2", minute = "30", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void purger() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            purgeService.purgerAsync(retentionJours());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Declenchement de la purge du releve journalier", e);
        }
    }

    private int retentionJours() {
        try {
            String valeur = StringUtils
                    .trimToEmpty(supportEventService.getParameter("KEY_VALORISATION_RETENTION_JOURS"));
            if (valeur.isEmpty()) {
                return RETENTION_DEFAUT;
            }
            int jours = Integer.parseInt(valeur);
            if (jours < RETENTION_MINIMALE) {
                LOG.log(Level.WARNING, "Retention demandee de {0} jours trop courte, {1} jours appliques.",
                        new Object[] { jours, RETENTION_MINIMALE });
                return RETENTION_MINIMALE;
            }
            return jours;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Lecture de KEY_VALORISATION_RETENTION_JOURS", e);
            return RETENTION_DEFAUT;
        }
    }
}
