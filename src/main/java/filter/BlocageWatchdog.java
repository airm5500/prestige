package filter;

import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;
import rest.service.dto.SupportEventDTO;

/**
 * Chien de garde des blocages : toutes les 20 secondes, verifie si une requete API est en traitement depuis plus de
 * SEUIL_MS. Si oui, capture la liste des requetes en cours ET la photographie complete de tous les threads du serveur
 * (avec les verrous detenus/attendus), puis l'ecrit dans le log serveur et dans le Centre de Support. C'est la piece a
 * conviction qui permet de savoir exactement OU l'application est coincee (attente d'une connexion du pool JDBC, verrou
 * EclipseLink, requete MySQL qui ne repond pas...) quand "plus aucune donnee ne s'affiche".
 *
 * Lecture seule et sans effet sur le traitement des requetes ; un rapport au plus toutes les 5 minutes.
 */
@Singleton
@Startup
public class BlocageWatchdog {

    private static final Logger LOG = Logger.getLogger(BlocageWatchdog.class.getName());

    /** Age a partir duquel une requete en cours est consideree comme bloquee. */
    private static final long SEUIL_MS = 20_000L;
    /** Delai minimum entre deux rapports pour ne pas inonder le log et le support. */
    private static final long COOLDOWN_MS = 300_000L;
    /** Nombre maximum de frames conservees par thread dans le rapport. */
    private static final int MAX_FRAMES = 50;

    @EJB
    private SupportEventService supportEventService;

    private volatile long dernierRapportMs = 0L;

    @Schedule(hour = "*", minute = "*", second = "*/20", persistent = false)
    public void surveiller() {
        try {
            List<SlowRequestFilter.RequeteEnCours> enCours = SlowRequestFilter.requetesEnCours();
            long maintenant = System.currentTimeMillis();
            SlowRequestFilter.RequeteEnCours plusAncienne = null;
            for (SlowRequestFilter.RequeteEnCours r : enCours) {
                if (plusAncienne == null || r.debutMs < plusAncienne.debutMs) {
                    plusAncienne = r;
                }
            }
            if (plusAncienne == null || maintenant - plusAncienne.debutMs < SEUIL_MS) {
                return;
            }
            if (maintenant - dernierRapportMs < COOLDOWN_MS) {
                return;
            }
            dernierRapportMs = maintenant;

            long ageS = (maintenant - plusAncienne.debutMs) / 1000;
            String rapport = construireRapport(enCours, maintenant);
            // Toujours dans le log serveur d'abord : il reste disponible meme si la base est bloquee.
            LOG.warning("BLOCAGE DETECTE : requete en traitement depuis " + ageS + "s : " + plusAncienne.methode + " "
                    + plusAncienne.uri + "\n" + rapport);

            SupportEventDTO dto = new SupportEventDTO();
            dto.setType("JAVA");
            dto.setNiveau("FATAL");
            dto.setModule("BLOCAGE");
            dto.setMessageCourt(StringUtils.abbreviate("Blocage détecté : requête en traitement depuis " + ageS + "s : "
                    + plusAncienne.methode + " " + plusAncienne.uri, 500));
            dto.setUrlOuEcran(StringUtils.abbreviate(plusAncienne.methode + " " + plusAncienne.uri, 255));
            dto.setPayloadJson(StringUtils.abbreviate("Explication : une requête dépasse " + (SEUIL_MS / 1000)
                    + "s de traitement, signe que le serveur est coincé (pool de connexions JDBC vide, verrou en base,"
                    + " verrou interne JPA...). La photographie des threads ci-dessous montre où chaque thread est"
                    + " arrêté : chercher les threads en état WAITING/BLOCKED et la ressource qu'ils attendent.",
                    4000));
            dto.setStack(StringUtils.abbreviate(rapport, 20000));
            // Asynchrone : si la base est bloquee, l'enregistrement echouera sans consequence,
            // le rapport complet etant deja dans le log serveur.
            supportEventService.record(dto, "");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "surveillance des blocages", e);
        }
    }

    private String construireRapport(List<SlowRequestFilter.RequeteEnCours> enCours, long maintenant) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== REQUETES API EN COURS (").append(enCours.size()).append(") ===\n");
        for (SlowRequestFilter.RequeteEnCours r : enCours) {
            sb.append(String.format("%6ds  %s %s  [thread %s]%n", (maintenant - r.debutMs) / 1000, r.methode, r.uri,
                    r.nomThread));
        }
        sb.append("\n=== PHOTOGRAPHIE DES THREADS ===\n");
        try {
            ThreadMXBean threads = ManagementFactory.getThreadMXBean();
            ThreadInfo[] infos;
            try {
                infos = threads.dumpAllThreads(true, true);
            } catch (Throwable t) {
                infos = threads.dumpAllThreads(false, false);
            }
            long[] bloquesEnInterblocage = threads.findDeadlockedThreads();
            if (bloquesEnInterblocage != null && bloquesEnInterblocage.length > 0) {
                sb.append("!!! INTERBLOCAGE (deadlock) DETECTE ENTRE ").append(bloquesEnInterblocage.length)
                        .append(" THREADS !!!\n");
            }
            for (ThreadInfo info : infos) {
                if (info == null) {
                    continue;
                }
                sb.append('"').append(info.getThreadName()).append("\" ").append(info.getThreadState());
                if (info.getLockName() != null) {
                    sb.append(" en attente de ").append(info.getLockName());
                }
                if (info.getLockOwnerName() != null) {
                    sb.append(" detenu par \"").append(info.getLockOwnerName()).append('"');
                }
                sb.append('\n');
                StackTraceElement[] frames = info.getStackTrace();
                int limite = Math.min(frames.length, MAX_FRAMES);
                for (int i = 0; i < limite; i++) {
                    sb.append("    at ").append(frames[i]).append('\n');
                }
                if (frames.length > limite) {
                    sb.append("    ... ").append(frames.length - limite).append(" frames supplémentaires\n");
                }
                sb.append('\n');
            }
        } catch (Throwable t) {
            sb.append("(photographie des threads impossible : ").append(t).append(")\n");
        }
        return sb.toString();
    }
}
