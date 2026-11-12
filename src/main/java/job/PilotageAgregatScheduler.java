
package job;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import config.AppConfig;
import rest.service.impl.PilotageAgregats;
import rest.service.impl.PilotageSuiviService;

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

    /** Courbes de l'onglet « A suivre », calculees apres les agregats qu'elles lisent (demande du 02/11). */
    @Inject
    private PilotageSuiviService suivi;

    /**
     * Lenteurs d'appaul (12/11) : le deploiement attendait aussi les courbes « A suivre » (4 min 11 a 4 min 40 sur la
     * copie d'appaul, 1 min sur le poste local). Ce n'est qu'un cache en memoire : il est calcule en tache de fond,
     * apres les agregats qu'il lit. Sans executeur, ou s'il refuse, calcul sur place comme avant.
     */
    @Resource(name = "concurrent/__defaultManagedExecutorService")
    private Executor executeur;

    private static final Logger LOG = Logger.getLogger(PilotageAgregatScheduler.class.getName());

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void runOnStartup() {
        agregats.prechauffer();
        Runnable courbes = () -> {
            long t0 = System.currentTimeMillis();
            suivi.prechauffer();
            LOG.log(Level.INFO, "Pilotage : courbes « A suivre » calculees d''avance en tache de fond ({0} ms)",
                    System.currentTimeMillis() - t0);
        };
        if (executeur == null) {
            courbes.run();
            return;
        }
        try {
            executeur.execute(courbes);
        } catch (RejectedExecutionException e) {
            courbes.run();
        }
    }

    @Schedule(hour = "0", minute = "25", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void run() {
        if (!appConfig.isServerMode()) {
            return;
        }
        /* Le mois qui vient de finir est clos : on le calcule cette nuit, pour que personne ne l'attende demain. */
        agregats.prechauffer();
        /* nouvelle journee : le cache des courbes repart de zero, on le remplit avant l'ouverture */
        suivi.prechauffer();
    }
}
