
package job;

import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import config.AppConfig;
import rest.service.impl.PilotageAgregats;

/**
 * Prepare les agregats du menu de pilotage AVANT qu'on ouvre l'ecran.
 *
 * <p>
 * Le menu de pilotage lit des mois deja calcules : c'est ce qui le rend rapide. Restait un trou : le tout premier
 * affichage d'un mois, lui, le calculait - dans la requete de l'operateur, qui attendait. Le journal du support du
 * 20/09 le montre onglet par onglet, plus de cinq secondes au premier passage et quelques millisecondes ensuite.
 *
 * <p>
 * Ce traitement bouche le trou : au demarrage du serveur, puis chaque nuit apres la valorisation du stock, les mois
 * clos manquants sont calcules pendant que personne ne regarde. Il ne recalcule rien de ce qui existe deja, il ne
 * remplit que les trous : sur une officine a jour, il ne fait rien et ne coute rien.
 *
 * <p>
 * Il passe APRES la valorisation quotidienne (00h05), parce que l'onglet Stock lit ce releve-la.
 */
@Singleton
public class PilotageAgregatScheduler {

    @Inject
    private PilotageAgregats agregats;

    @Inject
    private AppConfig appConfig;

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void runOnStartup() {
        agregats.prechauffer();
    }

    @Schedule(hour = "0", minute = "25", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        /* Le mois qui vient de finir est clos : on le calcule cette nuit, pour que personne ne l'attende demain. */
        agregats.prechauffer();
    }
}
