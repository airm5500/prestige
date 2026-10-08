package job;

import config.AppConfig;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.PharmaMlService;

/**
 * PharmaML, reponses differees (retours du 08/10) : toutes les 5 minutes, sur le poste serveur seulement, les
 * grossistes ayant un envoi en attente (reponse « FIN_SERVICE ») sont interroges par une demande de vidage, si
 * KEY_PHARMAML_VIDAGE_AUTO vaut 1. Rien n'est envoye s'il n'y a aucun envoi en attente.
 */
@Singleton
public class PharmaMlVidageScheduler {

    private static final Logger LOG = Logger.getLogger(PharmaMlVidageScheduler.class.getName());

    @Inject
    private AppConfig appConfig;

    @EJB
    private PharmaMlService pharmaMl;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Schedule(hour = "*", minute = "*/5", second = "20", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    @SuppressWarnings("unchecked")
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            List<Object> p = em
                    .createNativeQuery(
                            "SELECT str_VALUE FROM t_parameters" + " WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_AUTO'")
                    .getResultList();
            if (!p.isEmpty() && "0".equals(String.valueOf(p.get(0)).trim())) {
                return;
            }
            Number n = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_attente"
                            + " WHERE str_STATUT = 'EN_ATTENTE' AND dt_ENVOI > NOW() - INTERVAL 15 DAY")
                    .getSingleResult();
            if (n.intValue() > 0) {
                pharmaMl.recupererReponses(null, true);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "PharmaML : recuperation automatique des reponses", e);
        }
    }
}
