package job;

import dal.TParameters;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.ejb.DependsOn;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import util.TelephoneCi;

/**
 * Retour du 22/11 sur le point 8.3 du plan du 21/11 : le logiciel peut etre installe hors de Cote d'Ivoire. L'indicatif
 * du pays de l'officine (parametre {@value #CLE}, 225 par defaut) est lu au demarrage puis toutes les cinq minutes, et
 * pose dans {@link TelephoneCi}, qui controle tous les numeros (clients, SMS, WhatsApp). Une valeur illisible garde
 * 225.
 */
@Singleton
@Startup
@DependsOn({ "FlywayStartupBean" })
public class PaysOfficineBootstrap {

    public static final String CLE = "KEY_INDICATIF_PAYS";

    private static final Logger LOG = Logger.getLogger(PaysOfficineBootstrap.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @PostConstruct
    public void demarrer() {
        relire();
    }

    @Schedule(hour = "*", minute = "*/5", second = "7", persistent = false)
    public void relire() {
        try {
            TParameters p = em.find(TParameters.class, CLE);
            TelephoneCi.indicatifPays(p == null ? null : p.getStrVALUE());
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "lecture de l'indicatif du pays de l'officine", e);
        }
    }
}
