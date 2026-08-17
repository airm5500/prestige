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

/**
 * Watchdog de crash du serveur d'application. Detection post-mortem via un fichier temoin (heartbeat) rafraichi
 * regulierement et supprime a l'arret propre : si le fichier est encore present au demarrage, le serveur a plante. On
 * cree alors un incident avec l'indisponibilite estimee et la cause probable (extrait du server.log + hs_err_pid).
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
            heartbeatFile = resolveStorageBase().resolve("watchdog").resolve("heartbeat.flag");
            LocalDateTime now = LocalDateTime.now();
            if (Files.isRegularFile(heartbeatFile)) {
                // Le fichier temoin n'a pas ete supprime par un arret propre -> crash.
                LocalDateTime lastBeat = lireBattement(now);
                long downMin = Math.max(0, ChronoUnit.MINUTES.between(lastBeat, now));
                String message = "Redemarrage inattendu du serveur (arret non propre) - indisponibilite ~" + downMin
                        + " min";
                supportEventService.recordServerIncident("crash-" + lastBeat.format(STAMP), "ERROR", message,
                        buildDetail(lastBeat, now, downMin));
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
        Files.write(heartbeatFile, now.format(FMT).getBytes(StandardCharsets.UTF_8));
    }

    private LocalDateTime lireBattement(LocalDateTime fallback) {
        try {
            String contenu = new String(Files.readAllBytes(heartbeatFile), StandardCharsets.UTF_8).trim();
            return LocalDateTime.parse(contenu, FMT);
        } catch (Exception e) {
            try {
                return LocalDateTime.ofInstant(Files.getLastModifiedTime(heartbeatFile).toInstant(),
                        ZoneId.systemDefault());
            } catch (Exception ex) {
                return fallback;
            }
        }
    }

    private String buildDetail(LocalDateTime lastBeat, LocalDateTime now, long downMin) {
        StringBuilder sb = new StringBuilder();
        sb.append("Le serveur ne s'est pas arrete proprement (crash, kill, coupure de courant, OutOfMemory...).\n");
        sb.append("Derniere activite connue : ").append(lastBeat.format(FMT)).append("\n");
        sb.append("Redemarrage detecte      : ").append(now.format(FMT)).append("\n");
        sb.append("Indisponibilite estimee  : ~").append(downMin).append(" min\n\n");
        sb.append(collectCrashCause(lastBeat));
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
