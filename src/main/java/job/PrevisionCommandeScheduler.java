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
import rest.service.PrevisionCommandeService;

/**
 * Previsions de commande (plan d'octobre, section 5, lot L12) recalculees chaque nuit pour l'officine (emplacement
 * principal), sur le poste serveur seulement, si KEY_PREVISION_ACTIF vaut 1.
 */
@Singleton
public class PrevisionCommandeScheduler {

    private static final Logger LOG = Logger.getLogger(PrevisionCommandeScheduler.class.getName());

    @Inject
    private AppConfig appConfig;

    @EJB
    private PrevisionCommandeService service;

    @javax.persistence.PersistenceContext(unitName = "JTA_UNIT")
    private javax.persistence.EntityManager em;

    @Schedule(hour = "2", minute = "37", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode() || !actif()) {
            return;
        }
        if (!rest.PrevisionCommandeRessourceAcces.prendre()) {
            return;
        }
        try {
            service.recalculer("1", "NUIT");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "previsions de commande de la nuit", e);
        } finally {
            rest.PrevisionCommandeRessourceAcces.rendre();
        }
    }

    private boolean actif() {
        try {
            java.util.List<?> r = em
                    .createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_PREVISION_ACTIF'")
                    .getResultList();
            return r.isEmpty() || r.get(0) == null || "1".equals(String.valueOf(r.get(0)).trim());
        } catch (Exception e) {
            return true;
        }
    }
}
