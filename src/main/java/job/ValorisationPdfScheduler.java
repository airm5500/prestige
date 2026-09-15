package job;

import config.AppConfig;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import rest.service.SupportEventService;
import rest.service.impl.ValorisationPdfArchiveService;

/**
 * Archivage automatique de la valorisation du stock en PDF (evolution 5, point 2).
 *
 * <p>
 * A 01:20 les 27, 28, 29, 30, 31, 1, 2 et 3 du mois : apres le releve de 00:05 et la reprise de 01:30 du releve
 * journalier, de sorte que le document parte d'un stock deja arrete pour la journee ecoulee.
 * </p>
 *
 * <p>
 * Le declenchement est pose sur TOUS ces jours plutot que sur un seul, afin qu'une officine qui eteint son serveur une
 * nuit garde quand meme une valorisation de fin de mois : chacun des huit passages est independant et n'ecrit que le
 * fichier de sa propre journee.
 * </p>
 *
 * <p>
 * Un rattrapage au demarrage couvre le cas de l'officine qui n'allume son serveur que dans la journee : l'heure de
 * 01:20 n'y arrive jamais. Le rattrapage ne reecrit jamais un fichier deja present.
 * </p>
 */
@Singleton
public class ValorisationPdfScheduler {

    private static final Logger LOG = Logger.getLogger(ValorisationPdfScheduler.class.getName());

    @EJB
    private ValorisationPdfArchiveService archiveService;

    @EJB
    private SupportEventService supportEventService;

    @Inject
    private AppConfig appConfig;

    @Schedule(dayOfMonth = "27,28,29,30,31,1,2,3", hour = "1", minute = "20", second = "0", persistent = false)
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void archiver() {
        executer(false);
    }

    /**
     * Rattrapage au demarrage : appele par l'orchestration de demarrage, pas par un declenchement horaire. Sans effet
     * quand la nuit s'est bien passee, le fichier du jour etant alors deja present.
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void rattraperAuDemarrage() {
        executer(false);
    }

    private void executer(boolean forcer) {
        if (!appConfig.isServerMode()) {
            return;
        }
        LocalDate jour = LocalDate.now();
        if (!forcer && !ValorisationPdfArchiveService.jourDArchivage(jour)) {
            return;
        }
        try {
            Path archive = archiveService.archiver(jour, forcer);
            // La purge ne suit qu'un archivage reussi : si le document du jour n'a pas pu etre produit,
            // ce n'est pas le moment de retirer les anciens.
            if (archive != null) {
                archiveService.purger(jour);
                supportEventService.recordJobRun("VALORISATION_PDF");
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Archivage PDF de la valorisation", e);
        }
    }
}
