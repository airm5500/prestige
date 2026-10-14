package rest.service.impl.serveur;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * STABILITE DU SERVEUR : releve de l'etat de la JVM et de la machine (memoire, fils, fils HTTP actifs, ramasse-miettes,
 * processeur, memoire physique) et lecture du journal « Systeme » de Windows. Chaque mesure est isolee : une mesure
 * indisponible reste nulle et n'empeche pas les autres.
 */
public final class MesureServeur {

    private static final Logger LOG = Logger.getLogger(MesureServeur.class.getName());
    private static final long MO = 1024L * 1024L;

    private MesureServeur() {
    }

    public static ServeurVieService.Mesure releve() {
        ServeurVieService.Mesure m = new ServeurVieService.Mesure();
        try {
            Runtime rt = Runtime.getRuntime();
            m.memoireMaxMo = rt.maxMemory() / MO;
            m.memoireMo = (rt.totalMemory() - rt.freeMemory()) / MO;
        } catch (RuntimeException e) {
            LOG.log(Level.FINE, "memoire", e);
        }
        try {
            ThreadMXBean t = ManagementFactory.getThreadMXBean();
            m.fils = t.getThreadCount();
            int actifs = 0;
            for (ThreadInfo i : t.getThreadInfo(t.getAllThreadIds(), 0)) {
                if (i != null && i.getThreadName().startsWith("http-thread-pool")
                        && (i.getThreadState() == Thread.State.RUNNABLE
                                || i.getThreadState() == Thread.State.BLOCKED)) {
                    actifs++;
                }
            }
            m.filsHttpActifs = actifs;
        } catch (RuntimeException e) {
            LOG.log(Level.FINE, "fils", e);
        }
        try {
            long n = 0, ms = 0;
            for (GarbageCollectorMXBean g : ManagementFactory.getGarbageCollectorMXBeans()) {
                n += Math.max(0, g.getCollectionCount());
                ms += Math.max(0, g.getCollectionTime());
            }
            m.gcNombre = n;
            m.gcMs = ms;
        } catch (RuntimeException e) {
            LOG.log(Level.FINE, "gc", e);
        }
        try {
            java.lang.management.OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
            if (os instanceof com.sun.management.OperatingSystemMXBean) {
                com.sun.management.OperatingSystemMXBean s = (com.sun.management.OperatingSystemMXBean) os;
                m.cpuServeurPct = pct(s.getProcessCpuLoad());
                m.cpuMachinePct = pct(s.getSystemCpuLoad());
                m.ramLibreMo = s.getFreePhysicalMemorySize() / MO;
                m.ramTotaleMo = s.getTotalPhysicalMemorySize() / MO;
            }
        } catch (RuntimeException e) {
            LOG.log(Level.FINE, "systeme", e);
        }
        return m;
    }

    private static Double pct(double v) {
        return v < 0 ? null : v * 100;
    }

    /** Memoire physique de la machine, en octets (-1 si inconnue). */
    public static long ramMachine() {
        java.lang.management.OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        return os instanceof com.sun.management.OperatingSystemMXBean
                ? ((com.sun.management.OperatingSystemMXBean) os).getTotalPhysicalMemorySize() : -1;
    }

    public static boolean windows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).startsWith("windows");
    }

    static final String REQUETE_WINDOWS = "*[System[(EventID=41 or EventID=6005 or EventID=6006 or EventID=6008"
            + " or EventID=1074 or EventID=7031 or EventID=7034 or EventID=12)]]";

    /** Evenements recents du journal « Systeme » de Windows (vide ailleurs ou si wevtutil echoue). */
    public static List<CauseArret.EvenementWindows> journalWindows(Path dossierTravail) {
        if (!windows()) {
            return Collections.emptyList();
        }
        Path sortie = null;
        try {
            Files.createDirectories(dossierTravail);
            sortie = Files.createTempFile(dossierTravail, "wevtutil", ".xml");
            Process p = new ProcessBuilder("wevtutil", "qe", "System", "/q:" + REQUETE_WINDOWS, "/f:xml", "/rd:true",
                    "/c:80").redirectErrorStream(true).redirectOutput(sortie.toFile()).start();
            if (!p.waitFor(20, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return Collections.emptyList();
            }
            byte[] b = Files.readAllBytes(sortie);
            /*
             * selon la console, wevtutil ecrit en UTF-16 (octets nuls) ou en page de code locale : le XML utile est
             * ASCII
             */
            boolean utf16 = b.length > 1 && (b[1] == 0 || (b[0] == (byte) 0xFF && b[1] == (byte) 0xFE));
            return CauseArret.lireWevtutil(new String(b, utf16 ? StandardCharsets.UTF_16LE : StandardCharsets.UTF_8),
                    ZoneId.systemDefault());
        } catch (Exception e) {
            LOG.log(Level.FINE, "journal Windows", e);
            return Collections.emptyList();
        } finally {
            if (sortie != null) {
                try {
                    Files.deleteIfExists(sortie);
                } catch (Exception e) {
                    LOG.log(Level.FINE, "journal Windows", e);
                }
            }
        }
    }
}
