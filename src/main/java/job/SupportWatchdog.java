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
@javax.ejb.DependsOn({ "FlywayStartupBean" })
public class SupportWatchdog {

    private static final Logger LOG = Logger.getLogger(SupportWatchdog.class.getName());
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final int TAILLE_TAIL = 256 * 1024;

    @EJB
    private SupportEventService supportEventService;
    @EJB
    private rest.service.impl.serveur.ServeurVieService vie;

    /**
     * Stabilite du serveur (lot 4) : session en cours dans t_serveur_vie (-1 si non enregistree) et nom de la machine.
     */
    private volatile long vieId = -1;
    private volatile String hote = "?";

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
            enregistrerSession();
            Object[] precedente = precedenteEnCours();
            if (Files.isRegularFile(heartbeatFile)) {
                // Le fichier temoin n'a pas ete supprime par un arret propre -> crash. On relit la boite noire AVANT
                // de reecrire le temoin : c'est le dernier etat connu du serveur, il serait perdu sinon.
                BoiteNoire.Instantane dernier = lireBattement(now);
                avantCrash = dernier;
                long downMin = Math.max(0, ChronoUnit.MINUTES.between(dernier.horodatage, now));
                rest.service.impl.serveur.CauseArret.Diagnostic d = diagnostiquer(dernier);
                derniereCause = d;
                String message = "Arret brutal du serveur : " + d.code.libelle + " - indisponibilite ~" + downMin
                        + " min";
                supportEventService.recordServerIncident("crash-" + dernier.horodatage.format(STAMP), d.code.niveau,
                        message, buildDetail(dernier, now, downMin));
                if (precedente != null) {
                    vie.cloturerBrutal((Long) precedente[0], d, downMin);
                }
                LOG.log(Level.WARNING, "Crash serveur detecte : {0}", message);
            } else if (precedente != null) {
                // session restee « en cours » sans temoin (temoin supprime par l'arret, base injoignable a ce moment)
                try {
                    vie.arretPropre((Long) precedente[0]);
                } catch (Exception e) {
                    LOG.log(Level.FINE, "watchdog session precedente", e);
                }
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
        // Stabilite du serveur (lot 4) : releve detaille conserve 14 jours et signe de vie de la session
        try {
            rest.service.impl.serveur.ServeurVieService.Mesure m = rest.service.impl.serveur.MesureServeur.releve();
            m.vieId = vieId < 0 ? null : vieId;
            m.disqueLibreMo = disqueLibreMo() < 0 ? null : disqueLibreMo();
            List<filter.SlowRequestFilter.RequeteEnCours> enCours = filter.SlowRequestFilter.requetesEnCours();
            m.requetes = enCours.size();
            Long connexions = vie.statutMariadb("Threads_connected");
            m.bddConnexions = connexions == null ? null : connexions.intValue();
            vie.mesurer(hote, m);
            if (vieId >= 0) {
                vie.signe(vieId);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "watchdog releve", e);
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
        try {
            if (vieId >= 0) {
                vie.arretPropre(vieId);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "watchdog arret (historique)", e);
        }
    }

    /** Derniere cause diagnostiquee au demarrage (null s'il n'y a pas eu d'arret brutal). */
    private volatile rest.service.impl.serveur.CauseArret.Diagnostic derniereCause;

    public rest.service.impl.serveur.CauseArret.Diagnostic getDerniereCause() {
        return derniereCause;
    }

    /** Nom de la machine (cle de l'historique : une base peut servir plusieurs postes serveurs successifs). */
    public String getHote() {
        return hote;
    }

    private void enregistrerSession() {
        try {
            hote = java.net.InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            hote = StringUtils.defaultIfBlank(System.getenv("COMPUTERNAME"), "serveur");
        }
        try {
            java.lang.management.RuntimeMXBean rt = java.lang.management.ManagementFactory.getRuntimeMXBean();
            vieId = vie.demarrer(hote, ProcessHandle.current().pid(), System.getProperty("java.version"),
                    Runtime.getRuntime().maxMemory() / (1024L * 1024L), String.join(" ",
                            rest.service.impl.serveur.ServeurVieService.optionsUtiles(rt.getInputArguments())));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "historique du serveur non enregistre : {0}", e.getClass().getSimpleName());
        }
    }

    private Object[] precedenteEnCours() {
        try {
            return vieId < 0 ? null : vie.precedenteEnCours(hote, vieId);
        } catch (Exception e) {
            return null;
        }
    }

    /** Heure de demarrage de la JVM courante. */
    private static LocalDateTime demarrageJvm() {
        return LocalDateTime.ofInstant(
                java.time.Instant
                        .ofEpochMilli(java.lang.management.ManagementFactory.getRuntimeMXBean().getStartTime()),
                ZoneId.systemDefault());
    }

    /** Dossier des journaux de Payara : parametre s'il existe, sinon celui du domaine en cours. */
    private Path dossierLogs() {
        if (StringUtils.isNotBlank(serverLogDir) && Files.isDirectory(Paths.get(serverLogDir))) {
            return Paths.get(serverLogDir);
        }
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        Path p = racine == null ? null : Paths.get(racine, "logs");
        return p != null && Files.isDirectory(p) ? p : null;
    }

    /**
     * Fin du journal de la session tombee : server.log et ses fichiers renouvele(s) modifies depuis le dernier
     * battement, limites a la periode [dernier battement - 10 min, redemarrage de la JVM[ (le redemarrage ecrit lui
     * aussi beaucoup).
     */
    private String journalSessionTombee(LocalDateTime dernierSigne, LocalDateTime redemarrage) {
        Path dossier = dossierLogs();
        if (dossier == null) {
            return "";
        }
        long depuis = dernierSigne.minusMinutes(10).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        StringBuilder tout = new StringBuilder();
        try (Stream<Path> flux = Files.list(dossier)) {
            flux.filter(p -> p.getFileName().toString().startsWith("server.log"))
                    .filter(p -> p.toFile().lastModified() >= depuis)
                    .sorted(java.util.Comparator.comparingLong(p -> p.toFile().lastModified())).forEach(p -> {
                        try {
                            tout.append(readTail(p, 1024 * 1024)).append('\n');
                        } catch (IOException e) {
                            LOG.log(Level.FINE, "lecture journal", e);
                        }
                    });
        } catch (IOException e) {
            LOG.log(Level.FINE, "liste des journaux", e);
        }
        return rest.service.impl.serveur.CauseArret.extrait(tout.toString(), dernierSigne.minusMinutes(10),
                redemarrage);
    }

    /** Fichiers d'un dossier modifies depuis un instant, par prefixe et suffixe de nom. */
    private static boolean fichierRecent(List<Path> dossiers, String prefixe, String suffixe, LocalDateTime depuis) {
        long ms = depuis.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        for (Path d : dossiers) {
            if (d == null || !Files.isDirectory(d)) {
                continue;
            }
            try (Stream<Path> flux = Files.list(d)) {
                if (flux.anyMatch(p -> p.getFileName().toString().startsWith(prefixe)
                        && p.getFileName().toString().endsWith(suffixe) && p.toFile().lastModified() >= ms)) {
                    return true;
                }
            } catch (IOException e) {
                LOG.log(Level.FINE, "recherche " + suffixe, e);
            }
        }
        return false;
    }

    private rest.service.impl.serveur.CauseArret.Diagnostic diagnostiquer(BoiteNoire.Instantane dernier) {
        rest.service.impl.serveur.CauseArret.Indices x = new rest.service.impl.serveur.CauseArret.Indices();
        x.dernierSigne = dernier.horodatage;
        x.redemarrage = demarrageJvm();
        x.memoirePct = dernier.pourcentageMemoire();
        x.disqueLibreMo = dernier.disqueLibreMo;
        x.extraitLog = journalSessionTombee(dernier.horodatage, x.redemarrage);
        dernierExtrait = x.extraitLog;
        List<Path> dossiers = new ArrayList<>();
        dossiers.add(dossierLogs());
        dossiers.add(dossierLogs() == null ? null : dossierLogs().getParent());
        dossiers.add(Paths.get(System.getProperty("user.dir", ".")));
        dossiers.add(storageBase == null ? null : storageBase.resolve("dumps"));
        x.rapportJvm = fichierRecent(dossiers, "hs_err_pid", ".log", dernier.horodatage.minusMinutes(5));
        x.vidageMemoire = fichierRecent(dossiers, "java_pid", ".hprof", dernier.horodatage.minusMinutes(5));
        x.windows = rest.service.impl.serveur.MesureServeur.journalWindows(storageBase.resolve("watchdog"));
        dernierWindows = x.windows;
        try {
            Long uptime = vie.statutMariadb("Uptime");
            x.mariadbRedemarree = uptime != null
                    && uptime < ChronoUnit.SECONDS.between(dernier.horodatage, LocalDateTime.now());
        } catch (Exception e) {
            LOG.log(Level.FINE, "uptime MariaDB", e);
        }
        return rest.service.impl.serveur.CauseArret.diagnostiquer(x);
    }

    private volatile String dernierExtrait = "";
    private volatile List<rest.service.impl.serveur.CauseArret.EvenementWindows> dernierWindows = new ArrayList<>();

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
        rest.service.impl.serveur.CauseArret.Diagnostic d = derniereCause;
        if (d != null) {
            sb.append("=== Cause probable ===\n").append(d.code.libelle).append("\n").append(d.explication)
                    .append("\nConseil : ").append(d.conseil).append("\n");
            if (d.demarrageWindows != null) {
                sb.append("Demarrage de Windows : ").append(d.demarrageWindows.format(FMT)).append("\n");
            }
            sb.append("\n");
        }
        sb.append("=== Boite noire : dernier etat connu avant l'arret ===\n");
        sb.append(dernier.enTexte()).append("\n");
        sb.append(tendanceAvantArret(dernier.horodatage));
        if (!dernierWindows.isEmpty()) {
            sb.append("=== Journal Systeme de Windows (evenements utiles) ===\n");
            for (rest.service.impl.serveur.CauseArret.EvenementWindows e : dernierWindows) {
                if (!e.quand.isBefore(dernier.horodatage.minusHours(1))) {
                    sb.append(e.quand.format(FMT)).append("  ").append(e.id).append("  ").append(e.source)
                            .append(e.donnees.isEmpty() ? "" : "  " + StringUtils.abbreviate(e.donnees, 120))
                            .append('\n');
                }
            }
            sb.append('\n');
        }
        if (StringUtils.isNotBlank(dernierExtrait)) {
            sb.append("=== Fin du journal de la session tombee ===\n").append(StringUtils.right(dernierExtrait, 8000))
                    .append('\n');
            appendHsErr(sb, dernier.horodatage);
        } else {
            sb.append(collectCrashCause(dernier.horodatage));
        }
        return sb.toString();
    }

    /** Releves des 20 dernieres minutes avant l'arret : la memoire montait-elle, les fils HTTP etaient-ils satures ? */
    private String tendanceAvantArret(LocalDateTime avant) {
        StringBuilder sb = new StringBuilder();
        try {
            List<Object[]> l = vie.mesuresAvant(hote, avant.plusMinutes(1), 10);
            if (l.isEmpty()) {
                return "";
            }
            sb.append(
                    "=== Releves avant l'arret (memoire Mo/max, fils, fils HTTP actifs, CPU serveur %, CPU machine %,")
                    .append(" RAM libre Mo, connexions base) ===\n");
            for (Object[] r : l) {
                sb.append(r[0]).append("  ").append(r[1]).append('/').append(r[2]).append("  ").append(r[3])
                        .append("  ").append(r[4]).append("  ").append(r[5]).append("  ").append(r[6]).append("  ")
                        .append(r[7]).append("  ").append(r[10]).append('\n');
            }
            sb.append('\n');
        } catch (Exception e) {
            LOG.log(Level.FINE, "tendance", e);
        }
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
