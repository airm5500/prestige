package job;

import config.AppConfig;
import java.time.LocalDate;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import org.json.JSONObject;
import rest.service.impl.campagne.CampagneService;

/**
 * Campagnes (besoins du 11/10, lot 4) : chaque matin, sur le poste serveur, les propositions du jour (anniversaires,
 * fetes) sont PREPAREES si KEY_CAMPAGNE_AUTO_ACTIF vaut 1 (0 par defaut). Rien n'est envoye : la proposition attend sa
 * validation dans l'ecran Campagnes, et son nombre de messages s'affiche dans la cloche.
 */
@Singleton
public class CampagneScheduler {

    private static final Logger LOG = Logger.getLogger(CampagneScheduler.class.getName());

    @Inject
    private AppConfig appConfig;

    @EJB
    private CampagneService campagnes;

    @Schedule(hour = "7", minute = "29", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            JSONObject o = campagnes.genererPropositions(LocalDate.now(), false);
            LOG.log(Level.INFO, "Campagnes : {0} message(s) proposé(s), {1} proposition(s) expirée(s)",
                    new Object[] { o.optInt("proposes"), o.optInt("expirees") });
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Campagnes : préparation des propositions", e);
        }
    }
}
