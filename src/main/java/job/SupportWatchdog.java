/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Stream;
import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;
import util.BoiteNoire;

/**
 * Watchdog de crash du serveur d'application. Detection post-mortem via un fichier temoin (heartbeat) rafraichi
 * regulierement et supprime a l'arret propre : si le fichier est encore present au demarrage, le serveur a plante. On
 * cree alors un incident avec l'indisponibilite estimee et la cause probable (extrait du server.log + hs_err_pid).
 *
 * Le fichier temoin fait aussi office de BOITE NOIRE : a chaque battement il enregistre l'etat du serveur (memoire,
 * disque, requetes en vol). Apres un crash, c'est le seul etat connu d'avant l'arret. Aucune tache supplementaire n'est
 * planifiee pour cela : la mesure est portee par le battement qui existait deja.
 *
 * @author koben
 */
@Singleton
@Startup
@PermitAll
public class SupportWatchdog {

    private static final Logger LOG = Logger.getLogger(SupportWatchdog.class.getName());
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final int TAILLE_TAIL = 256 * 1024;

    @EJB
    private SupportEventService supportEventService;

    private volatile boolean enabled;
    private volatile String serverLogDir;
    private volatile Path heartbeatFile;
    private volatile Path storageBase;
    /**
     * Boite noire relue au demarrage quand un crash a ete detecte : dernier etat connu du serveur AVANT l'arret. Reste
     * consultable ensuite via le Centre de Support (le fichier temoin, lui, est immediatement reecrit).
     */
    private volatile BoiteNoire.Instantane avantCrash;

    @PostConstruct
    public void demarrage() {
        try {
            enabled = !"0"
                    .equals(StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_WATCHDOG_ENABLED")));
            if (!enabled) {
                LOG.info("Watchdog serveur desactive (SUPPORT_WATCHDOG_ENABLED=0)");
                return;
            }
            serverLogDir = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_SERVER_LOG_PATH"));
            storageBase = resolveStorageBase();
            heartbeatFile = storageBase.resolve("watchdog").resolve("heartbeat.flag");
            LocalDateTime now = LocalDateTime.now();
            if (Files.isRegularFile(heartbeatFile)) {
                // Le fichier temoin n'a pas ete supprime par un arret propre -> crash. On relit la boite noire AVANT
                // de reecrire le temoin : c'est le dernier etat connu du serveur, il serait perdu sinon.
                BoiteNoire.Instantane dernier = lireBattement(now);
                avantCrash = dernier;
                long downMin = Math.max(0, ChronoUnit.MINUTES.between(dernier.horodatage, now));
                String message = "Redemarrage inattendu du serveur (arret non propre) - indisponibilite ~" + downMin
                        + " min";
                supportEventService.recordServerIncident("crash-" + dernier.horodatage.format(STAMP), "ERROR", message,
                        buildDetail(dernier, now, downMin));
                LOG.log(Level.WARNING, "Crash serveur detecte : {0}", message);
            }
            ecrireBattement(now);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "watchdog demarrage", e);
        }
    }

    @Schedule(hour = "*", minute = "*/2", persistent = false)
    public void battement() {
        if (!enabled || heartbeatFile == null) {
            return;
        }
        try {
            ecrireBattement(LocalDateTime.now());
        } catch (Exception e) {
            LOG.log(Level.FINE, "watchdog battement", e);
        }
    }

    @PreDestroy
    public void arret() {
        // Arret propre : on supprime le temoin pour ne PAS declencher de fausse alerte au prochain demarrage.
        try {
            if (heartbeatFile != null) {
                Files.deleteIfExists(heartbeatFile);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "watchdog arret", e);
        }
    }

    private Path resolveStorageBase() {
        String configured = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_STORAGE_DIR"));
        return StringUtils.isNotBlank(configured) ? Paths.get(configured) : util.StockageDisque.sousDossier("support");
    }

    private void ecrireBattement(LocalDateTime now) throws IOException {
        if (heartbeatFile.getParent() != null) {
            Files.createDirectories(heartbeatFile.getParent());
        }
        Files.write(heartbeatFile, BoiteNoire.formater(releve(now)).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Photographie de l'etat courant du serveur. Chaque mesure est isolee : une mesure indisponible vaut
     * {@link BoiteNoire#INCONNU} et n'empeche pas les autres d'etre enregistrees. Le battement ne doit jamais echouer a
     * cause de la boite noire.
     */
    private BoiteNoire.Instantane releve(LocalDateTime now) {
        long memUtiliseeMo = BoiteNoire.INCONNU;
        long memMaxMo = BoiteNoire.INCONNU;
        try {
            Runtime rt = Runtime.getRuntime();
            memMaxMo = rt.maxMemory() / (1024L * 1024L);
            memUtiliseeMo = (rt.totalMemory() - rt.freeMemory()) / (1024L * 1024L);
        } catch (Exception e) {
            LOG.log(Level.FINE, "releve memoire", e);
        }
        long requetes = BoiteNoire.INCONNU;
        String plusLongue = null;
        long plusLongueMs = BoiteNoire.INCONNU;
        try {
            List<filter.SlowRequestFilter.RequeteEnCours> enCours = filter.SlowRequestFilter.requetesEnCours();
            requetes = enCours.size();
            long maintenant = System.currentTimeMillis();
            for (filter.SlowRequestFilter.RequeteEnCours requete : enCours) {
                long duree = maintenant - requete.debutMs;
                if (duree > plusLongueMs) {
                    plusLongueMs = duree;
                    plusLongue = requete.methode + " " + requete.uri;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "releve requetes", e);
        }
        return new BoiteNoire.Instantane(now, memUtiliseeMo, memMaxMo, disqueLibreMo(), requetes, plusLongue,
                plusLongueMs);
    }

    private long disqueLibreMo() {
        try {
            // Watchdog desactive : aucun de ces deux chemins n'est renseigne, la mesure est simplement indisponible.
            Path cible = storageBase != null ? storageBase : (heartbeatFile != null ? heartbeatFile.getParent() : null);
            if (cible == null || !Files.exists(cible)) {
                return BoiteNoire.INCONNU;
            }
            return Files.getFileStore(cible).getUsableSpace() / (1024L * 1024L);
        } catch (Exception e) {
            LOG.log(Level.FINE, "releve disque", e);
            return BoiteNoire.INCONNU;
        }
    }

    private BoiteNoire.Instantane lireBattement(LocalDateTime fallback) {
        try {
            String contenu = new String(Files.readAllBytes(heartbeatFile), StandardCharsets.UTF_8);
            return BoiteNoire.lire(contenu, dateDeModification(fallback));
        } catch (Exception e) {
            return BoiteNoire.Instantane.horodateSeul(dateDeModification(fallback));
        }
    }

    /** Repli quand le temoin est illisible : sa date de derniere modification vaut dernier battement. */
    private LocalDateTime dateDeModification(LocalDateTime fallback) {
        try {
            return LocalDateTime.ofInstant(Files.getLastModifiedTime(heartbeatFile).toInstant(),
                    ZoneId.systemDefault());
        } catch (Exception e) {
            return fallback;
        }
    }

    /**
     * Boite noire consultable a la demande depuis le Centre de Support : etat releve avant le dernier crash s'il y en a
     * eu un, puis etat courant du serveur.
     */
    public String consulterBoiteNoire() {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Boite noire du watchdog ===\n\n");
        if (!enabled) {
            sb.append("Watchdog desactive (SUPPORT_WATCHDOG_ENABLED=0) : aucun releve n'est enregistre.\n\n");
        }
        BoiteNoire.Instantane precedent = avantCrash;
        if (precedent != null) {
            sb.append("--- Dernier etat connu AVANT le crash detecte au demarrage ---\n");
            sb.append(precedent.enTexte()).append("\n");
        } else {
            sb.append("--- Aucun crash detecte au dernier demarrage ---\n\n");
        }
        sb.append("--- Etat courant ---\n");
        sb.append(releve(LocalDateTime.now()).enTexte());
        return sb.toString();
    }

    private String buildDetail(BoiteNoire.Instantane dernier, LocalDateTime now, long downMin) {
        StringBuilder sb = new StringBuilder();
        sb.append("Le serveur ne s'est pas arrete proprement (crash, kill, coupure de courant, OutOfMemory...).\n");
        sb.append("Derniere activite connue : ").append(dernier.horodatage.format(FMT)).append("\n");
        sb.append("Redemarrage detecte      : ").append(now.format(FMT)).append("\n");
        sb.append("Indisponibilite estimee  : ~").append(downMin).append(" min\n\n");
        // Boite noire : dans quel etat se trouvait le serveur au dernier battement. Le server.log dit ce qui s'est
        // passe, ces mesures disent s'il etait deja en difficulte (memoire saturee, disque plein, requetes bloquees).
        sb.append("=== Boite noire : dernier etat connu avant l'arret ===\n");
        sb.append(dernier.enTexte()).append("\n");
        sb.append(collectCrashCause(dernier.horodatage));
        return sb.toString();
    }

    private String collectCrashCause(LocalDateTime since) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Cause probable (analyse du server.log) ===\n");
        try {
            if (StringUtils.isBlank(serverLogDir)) {
                sb.append("(chemin du server.log non configure : parametre SUPPORT_SERVER_LOG_PATH)\n");
                return sb.toString();
            }
            Path serverLog = Paths.get(serverLogDir, "server.log");
            if (!Files.isRegularFile(serverLog)) {
                sb.append("server.log introuvable dans : ").append(serverLogDir).append("\n");
            } else {
                String tail = readTail(serverLog, TAILLE_TAIL);
                String signe = detecterSigne(tail);
                if (signe != null) {
                    sb.append("Indice detecte : ").append(signe).append("\n");
                }
                sb.append("\n--- Fin de server.log ---\n").append(StringUtils.right(tail, 8000));
            }
            appendHsErr(sb, since);
        } catch (Exception e) {
            sb.append("Analyse du log impossible : ").append(String.valueOf(e.getMessage()));
        }
        return sb.toString();
    }

    private String detecterSigne(String tail) {
        String t = tail == null ? "" : tail;
        if (t.contains("OutOfMemoryError")) {
            return "OutOfMemoryError (memoire JVM insuffisante)";
        }
        if (t.contains("StackOverflowError")) {
            return "StackOverflowError";
        }
        if (t.contains("GC overhead limit")) {
            return "GC overhead limit exceeded (memoire saturee)";
        }
        if (t.contains("No space left on device")) {
            return "Disque plein (No space left on device)";
        }
        if (t.contains("Connection is not available") || t.contains("Unable to acquire JDBC Connection")) {
            return "Pool de connexions JDBC sature (possible)";
        }
        return null;
    }

    private String readTail(Path file, int maxBytes) throws IOException {
        long size = Files.size(file);
        long from = Math.max(0, size - maxBytes);
        try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
            raf.seek(from);
            byte[] buf = new byte[(int) (size - from)];
            raf.readFully(buf);
            return new String(buf, StandardCharsets.UTF_8);
        }
    }

    private void appendHsErr(StringBuilder sb, LocalDateTime since) {
        try {
            List<Path> dirs = new ArrayList<>();
            if (StringUtils.isNotBlank(serverLogDir)) {
                Path logs = Paths.get(serverLogDir);
                dirs.add(logs);
                if (logs.getParent() != null) {
                    dirs.add(logs.getParent());
                }
            }
            dirs.add(Paths.get(System.getProperty("user.dir", ".")));
            long sinceMs = since.minusMinutes(5).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            for (Path dir : dirs) {
                if (dir == null || !Files.isDirectory(dir)) {
                    continue;
                }
                try (Stream<Path> flux = Files.list(dir)) {
                    flux.filter(p -> {
                        String n = p.getFileName().toString();
                        return n.startsWith("hs_err_pid") && n.endsWith(".log");
                    }).filter(p -> p.toFile().lastModified() >= sinceMs).limit(3)
                            .forEach(p -> sb.append("\n\n=== Crash JVM natif detecte : ").append(p.toString())
                                    .append(" ===\n").append(lireDebut(p, 4000)));
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "appendHsErr", e);
        }
    }

    private String lireDebut(Path file, int maxChars) {
        try {
            return StringUtils.abbreviate(new String(Files.readAllBytes(file), StandardCharsets.UTF_8), maxChars);
        } catch (Exception e) {
            return "(illisible)";
        }
    }
}
