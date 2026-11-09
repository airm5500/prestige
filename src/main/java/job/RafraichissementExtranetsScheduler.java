package job;

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import org.json.JSONObject;
import rest.service.extranet.ExtranetService;

/**
 * Extranets grossistes (demande du 08/11) : toutes les 10 minutes, relit les listes dont le delai reglé est echu
 * (onglet Rafraîchissement), pour garder en base une copie recente meme si Internet manque ensuite. Aucune liste n'est
 * reglee par defaut : rien n'est lu tant que l'administrateur n'a pas choisi de delai. Une lecture par liste, chacune
 * dans sa transaction ; un echec garde le cache precedent. Journal : code de la liste et resultat, jamais de donnee.
 */
@Singleton
public class RafraichissementExtranetsScheduler {

    private static final Logger LOG = Logger.getLogger(RafraichissementExtranetsScheduler.class.getName());

    @EJB
    private ExtranetService service;

    @Schedule(hour = "*", minute = "*/10", second = "40", persistent = false)
    public void rafraichir() {
        List<String[]> dues;
        try {
            dues = service.listesARafraichir();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Rafraîchissement des extranets : lecture des réglages impossible", e);
            return;
        }
        for (String[] l : dues) {
            try {
                /*
                 * option A du 09/11 : meme verrou que les lectures lancees a l'ecran ; une liste deja en lecture n'est
                 * pas relue une seconde fois, et l'ecran suit la lecture automatique comme une lecture manuelle
                 */
                JSONObject r = rest.service.extranet.commun.EtatLectures.duServeur().executer(
                        rest.service.extranet.commun.EtatLectures.cle(l[0], l[1]),
                        ExtranetService.UTILISATEUR_AUTOMATIQUE, () -> service.rafraichir(l[0], l[1]));
                if (r == null) {
                    LOG.log(Level.INFO, "Rafraîchissement {0} {1} : lecture déjà en cours, non doublée",
                            new Object[] { l[0], l[1] });
                    continue;
                }
                LOG.log(Level.INFO, "Rafraîchissement {0} {1} : {2}", new Object[] { l[0], l[1],
                        r.optBoolean("success") ? "lue" : "échec " + r.optString("nature", "") });
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Rafraîchissement " + l[0] + " " + l[1] + " : " + e.getClass().getSimpleName());
            }
        }
    }
}
