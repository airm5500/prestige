package filter;

import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    /** Garde-fou de la taille du rapport ecrit au Centre de Support (bien au-dela d'une photographie habituelle). */
    static final int TAILLE_MAX_RAPPORT = 5_000_000;

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
            // en entier : le fichier du Centre de Support garde tout (l'extrait en base et la cellule Excel en gardent
            // le debut, qui porte maintenant les threads des requetes bloquees)
            dto.setStack(StringUtils.abbreviate(rapport, TAILLE_MAX_RAPPORT));
            // Asynchrone : si la base est bloquee, l'enregistrement echouera sans consequence,
            // le rapport complet etant deja dans le log serveur.
            supportEventService.record(dto, "");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "surveillance des blocages", e);
        }
    }

    private String construireRapport(List<SlowRequestFilter.RequeteEnCours> enCours, long maintenant) {
        ThreadInfo[] infos;
        long[] interblocage = null;
        try {
            ThreadMXBean threads = ManagementFactory.getThreadMXBean();
            try {
                infos = threads.dumpAllThreads(true, true);
            } catch (Throwable t) {
                infos = threads.dumpAllThreads(false, false);
            }
            interblocage = threads.findDeadlockedThreads();
        } catch (Throwable t) {
            return rapport(enCours, new ThreadInfo[0], null, maintenant) + "(photographie des threads impossible : " + t
                    + ")\n";
        }
        return rapport(enCours, infos, interblocage, maintenant);
    }

    /**
     * Retours du 10/10 : la photographie des threads etait coupee dans la cellule Excel du journal (4 000 caracteres),
     * avant d'atteindre le thread fautif - elle listait les threads dans l'ordre du serveur, des dizaines de threads au
     * repos d'abord. Elle est maintenant ordonnee pour que le debut suffise :
     * <ol>
     * <li>les requetes en cours ;</li>
     * <li>les threads QUI TRAITENT ces requetes, avec leur pile : c'est la que se lit ce qui bloque ;</li>
     * <li>les threads qui DETIENNENT les verrous que ceux-ci attendent ;</li>
     * <li>les autres threads BLOCKED ;</li>
     * <li>tous les autres, regroupes par pile identique (« 32 threads au repos : ... ») au lieu d'etre repetes.</li>
     * </ol>
     * Rien n'est retire : le rapport entier est garde dans le fichier du Centre de Support.
     */
    static String rapport(List<SlowRequestFilter.RequeteEnCours> enCours, ThreadInfo[] infos, long[] interblocage,
            long maintenant) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== REQUETES API EN COURS (").append(enCours.size()).append(") ===\n");
        Set<String> nomsRequetes = new HashSet<>();
        for (SlowRequestFilter.RequeteEnCours r : enCours) {
            sb.append(String.format("%6ds  %s %s  [thread %s]%n", (maintenant - r.debutMs) / 1000, r.methode, r.uri,
                    r.nomThread));
            nomsRequetes.add(r.nomThread);
        }
        Set<Long> enInterblocage = new HashSet<>();
        if (interblocage != null && interblocage.length > 0) {
            for (long id : interblocage) {
                enInterblocage.add(id);
            }
            sb.append("\n!!! INTERBLOCAGE (deadlock) DETECTE ENTRE ").append(interblocage.length)
                    .append(" THREADS !!!\n");
        }
        Map<Long, ThreadInfo> parId = new LinkedHashMap<>();
        for (ThreadInfo info : infos) {
            if (info != null) {
                parId.put(info.getThreadId(), info);
            }
        }
        Set<Long> deja = new HashSet<>();
        List<ThreadInfo> requetes = new ArrayList<>();
        for (ThreadInfo info : parId.values()) {
            if (nomsRequetes.contains(info.getThreadName()) || enInterblocage.contains(info.getThreadId())) {
                requetes.add(info);
            }
        }
        sb.append("\n=== THREADS QUI TRAITENT LES REQUETES EN COURS (").append(requetes.size()).append(") ===\n");
        for (ThreadInfo info : requetes) {
            ecrireThread(sb, info, MAX_FRAMES);
            deja.add(info.getThreadId());
        }
        List<ThreadInfo> detenteurs = new ArrayList<>();
        for (ThreadInfo info : requetes) {
            ThreadInfo d = parId.get(info.getLockOwnerId());
            if (info.getLockOwnerId() >= 0 && d != null && !deja.contains(d.getThreadId())) {
                detenteurs.add(d);
                deja.add(d.getThreadId());
            }
        }
        if (!detenteurs.isEmpty()) {
            sb.append("\n=== DETENTEURS DES VERROUS ATTENDUS (").append(detenteurs.size()).append(") ===\n");
            for (ThreadInfo info : detenteurs) {
                ecrireThread(sb, info, MAX_FRAMES);
            }
        }
        List<ThreadInfo> bloques = new ArrayList<>();
        for (ThreadInfo info : parId.values()) {
            if (!deja.contains(info.getThreadId()) && info.getThreadState() == Thread.State.BLOCKED) {
                bloques.add(info);
                deja.add(info.getThreadId());
            }
        }
        if (!bloques.isEmpty()) {
            sb.append("\n=== AUTRES THREADS BLOQUES (").append(bloques.size()).append(") ===\n");
            for (ThreadInfo info : bloques) {
                ecrireThread(sb, info, MAX_FRAMES);
            }
        }
        Map<String, List<ThreadInfo>> groupes = new LinkedHashMap<>();
        for (ThreadInfo info : parId.values()) {
            if (deja.contains(info.getThreadId())) {
                continue;
            }
            StringBuilder cle = new StringBuilder(String.valueOf(info.getThreadState())).append('|');
            StackTraceElement[] frames = info.getStackTrace();
            for (int i = 0; i < Math.min(frames.length, MAX_FRAMES); i++) {
                cle.append(frames[i]).append('\n');
            }
            groupes.computeIfAbsent(cle.toString(), k -> new ArrayList<>()).add(info);
        }
        sb.append("\n=== AUTRES THREADS (").append(parId.size() - deja.size())
                .append("), regroupes par pile identique ===\n");
        groupes.values().stream().sorted((a, b) -> Integer.compare(b.size(), a.size())).forEach(groupe -> {
            if (groupe.size() > 1) {
                StringBuilder noms = new StringBuilder();
                for (ThreadInfo t : groupe) {
                    noms.append(noms.length() == 0 ? "" : ", ").append(t.getThreadName());
                }
                sb.append(groupe.size()).append(" threads identiques ").append(groupe.get(0).getThreadState())
                        .append(" : ").append(StringUtils.abbreviate(noms.toString(), 300)).append('\n');
                ecrirePile(sb, groupe.get(0), MAX_FRAMES);
            } else {
                ecrireThread(sb, groupe.get(0), MAX_FRAMES);
            }
        });
        return sb.toString();
    }

    private static void ecrireThread(StringBuilder sb, ThreadInfo info, int maxFrames) {
        sb.append('"').append(info.getThreadName()).append("\" ").append(info.getThreadState());
        if (info.getLockName() != null) {
            sb.append(" en attente de ").append(info.getLockName());
        }
        if (info.getLockOwnerName() != null) {
            sb.append(" detenu par \"").append(info.getLockOwnerName()).append('"');
        }
        sb.append('\n');
        ecrirePile(sb, info, maxFrames);
    }

    private static void ecrirePile(StringBuilder sb, ThreadInfo info, int maxFrames) {
        StackTraceElement[] frames = info.getStackTrace();
        int limite = Math.min(frames.length, maxFrames);
        for (int i = 0; i < limite; i++) {
            sb.append("    at ").append(frames[i]).append('\n');
        }
        if (frames.length > limite) {
            sb.append("    ... ").append(frames.length - limite).append(" frames supplémentaires\n");
        }
        sb.append('\n');
    }
}
