package job;

import java.io.File;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.annotation.Resource;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * STABILITE DU SERVEUR (lot 4) : REPARATION AUTOMATIQUE du pool de connexions a la base.
 * <p>
 * Chaque minute, une connexion est demandee au pool et utilisee (SELECT 1) : sans controle des connexions, le pool
 * garde apres un redemarrage de MariaDB (coupure de courant, mise a jour) des connexions mortes, et chaque vente echoue
 * jusqu'au redemarrage de Payara. Si le pool echoue deux minutes de suite ALORS QUE MariaDB repond sur son port, le
 * pool est vide (asadmin flush-connection-pool) : ses connexions mortes sont jetees et remplacees. Si MariaDB ne repond
 * pas, on attend qu'elle revienne (vider ne servirait a rien). Chaque reparation est notee dans le Centre de support.
 * Parametre SUPPORT_POOL_REPARATION (1 par defaut ; 0 : surveiller sans reparer).
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.BEAN)
@javax.ejb.TransactionAttribute(javax.ejb.TransactionAttributeType.NOT_SUPPORTED)
public class PoolReparation {

    private static final Logger LOG = Logger.getLogger(PoolReparation.class.getName());
    static final int ECHECS_AVANT_REPARATION = 2;
    static final int REPARATIONS_MAX_PAR_HEURE = 3;

    public enum Action {
        RIEN, SURVEILLER, ATTENDRE_LA_BASE, VIDER_LE_POOL, TROP_DE_REPARATIONS
    }

    @Resource(mappedName = "jdbc/__laborex_pool")
    private DataSource dataSource;
    @EJB
    private SupportEventService supportEventService;

    private volatile int echecs;
    private volatile long[] reparations = new long[0];
    private volatile String dernierEtat = "Pas encore vérifié";
    private volatile long derniereVerification, derniereReparation;
    private volatile int nombreReparations;
    private volatile boolean reparationActive = true;
    /** Incidents a publier dans le Centre de support : il ecrit par le pool, on attend qu'il fonctionne. */
    private final java.util.List<String[]> enAttente = new java.util.concurrent.CopyOnWriteArrayList<>();

    private void noter(String code, String niveau, String message, String detail) {
        LOG.log(Level.WARNING, "{0} : {1}", new Object[] { message, detail });
        enAttente.add(new String[] { code, niveau, message, detail });
        if (poolOk()) {
            publierEnAttente();
        }
    }

    private void publierEnAttente() {
        for (String[] i : enAttente) {
            try {
                supportEventService.recordServerIncident(i[0], i[1], i[2], i[3]);
                enAttente.remove(i);
            } catch (Exception e) {
                LOG.log(Level.FINE, "incident en attente", e);
                return;
            }
        }
    }

    /**
     * Decision (pure) : etat du pool, joignabilite de MariaDB, echecs consecutifs, reparations de la derniere heure.
     */
    static Action decider(boolean poolOk, boolean baseJoignable, int echecsConsecutifs, int reparationsHeure,
            boolean reparationActive) {
        if (poolOk) {
            return Action.RIEN;
        }
        if (!baseJoignable) {
            return Action.ATTENDRE_LA_BASE;
        }
        if (echecsConsecutifs < ECHECS_AVANT_REPARATION) {
            return Action.SURVEILLER;
        }
        if (!reparationActive) {
            return Action.SURVEILLER;
        }
        return reparationsHeure >= REPARATIONS_MAX_PAR_HEURE ? Action.TROP_DE_REPARATIONS : Action.VIDER_LE_POOL;
    }

    static final Pattern HOTE_PORT = Pattern.compile("jdbc:(?:mariadb|mysql)://([^:/?]+)(?::(\\d+))?");

    /** Hote et port de MariaDB lus dans l'URL du pool ({hote, port}), localhost:3306 par defaut. */
    static String[] hotePort(String url) {
        Matcher m = url == null ? null : HOTE_PORT.matcher(url);
        if (m == null || !m.find()) {
            return new String[] { "127.0.0.1", "3306" };
        }
        return new String[] { m.group(1), m.group(2) == null ? "3306" : m.group(2) };
    }

    private boolean poolOk() {
        if (dataSource == null) {
            return false;
        }
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            st.setQueryTimeout(10);
            st.execute("SELECT 1");
            return true;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Pool de connexions en echec : {0}",
                    e.getClass().getSimpleName() + " " + StringUtils.abbreviate(String.valueOf(e.getMessage()), 200));
            return false;
        }
    }

    private String urlDuPool() {
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        try {
            Path d = racine == null ? null : Paths.get(racine, "config", "domain.xml");
            if (d != null && Files.isRegularFile(d)) {
                Matcher m = Pattern.compile("<property name=\"(?:url|URL)\" value=\"(jdbc:(?:mariadb|mysql)[^\"]*)\"")
                        .matcher(new String(Files.readAllBytes(d), java.nio.charset.StandardCharsets.UTF_8));
                if (m.find()) {
                    return m.group(1);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "lecture de l'url du pool", e);
        }
        return null;
    }

    private static boolean baseJoignable(String hote, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(hote, port), 3000);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Vidage du pool par asadmin (installation locale de Payara). */
    static boolean viderLePool(String pool) {
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        if (racine == null) {
            return false;
        }
        boolean windows = System.getProperty("os.name", "").toLowerCase(java.util.Locale.ROOT).startsWith("windows");
        File bin = Paths.get(racine).getParent().getParent().getParent().resolve("bin").toFile();
        File asadmin = new File(bin, windows ? "asadmin.bat" : "asadmin");
        if (!asadmin.isFile()) {
            return false;
        }
        try {
            ProcessBuilder pb = windows
                    ? new ProcessBuilder("cmd", "/c", asadmin.getAbsolutePath(), "flush-connection-pool", pool)
                    : new ProcessBuilder(asadmin.getAbsolutePath(), "flush-connection-pool", pool);
            Process p = pb.redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
            if (!p.waitFor(90, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return false;
            }
            return p.exitValue() == 0;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Vidage du pool impossible", e);
            return false;
        }
    }

    private int reparationsDerniereHeure(long maintenant) {
        int n = 0;
        for (long t : reparations) {
            n += maintenant - t < 3_600_000L ? 1 : 0;
        }
        return n;
    }

    @Schedule(hour = "*", minute = "*", second = "30", persistent = false)
    public void verifier() {
        try {
            long maintenant = System.currentTimeMillis();
            derniereVerification = maintenant;
            boolean ok = poolOk();
            echecs = ok ? 0 : echecs + 1;
            String url = ok ? null : urlDuPool();
            String[] hp = hotePort(url);
            boolean base = ok || baseJoignable(hp[0], Integer.parseInt(hp[1]));
            /* le parametre se lit par le pool : s'il est casse, on garde la derniere valeur lue */
            if (ok) {
                try {
                    reparationActive = !"0".equals(
                            StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_POOL_REPARATION")));
                } catch (Exception e) {
                    LOG.log(Level.FINE, "parametre SUPPORT_POOL_REPARATION", e);
                }
                publierEnAttente();
            }
            boolean active = reparationActive;
            Action a = decider(ok, base, echecs, reparationsDerniereHeure(maintenant), active);
            switch (a) {
            case RIEN:
                dernierEtat = "Pool en bon état";
                break;
            case ATTENDRE_LA_BASE:
                dernierEtat = "MariaDB ne répond pas sur " + hp[0] + ":" + hp[1] + " : attente de son retour";
                if (echecs == ECHECS_AVANT_REPARATION) {
                    noter("base-injoignable-" + LocalDate.now(), "ERROR",
                            "MariaDB ne repond pas : les ventes sont impossibles jusqu'a son retour",
                            "Hote " + hp[0] + ", port " + hp[1] + ". Verifier que le service MariaDB est demarre.");
                }
                break;
            case SURVEILLER:
                dernierEtat = "Pool en échec (" + echecs + " fois de suite)"
                        + (active ? "" : " - réparation désactivée");
                break;
            case TROP_DE_REPARATIONS:
                dernierEtat = "Pool en échec malgré " + REPARATIONS_MAX_PAR_HEURE
                        + " réparations dans l'heure : redémarrer Payara";
                if (echecs == ECHECS_AVANT_REPARATION) {
                    noter("pool-irreparable-" + LocalDate.now(), "FATAL",
                            "Pool de connexions irreparable : redemarrer le serveur", dernierEtat);
                }
                break;
            default:
                boolean fait = viderLePool(nomDuPool());
                long[] r = java.util.Arrays.copyOf(reparations, reparations.length + 1);
                r[r.length - 1] = maintenant;
                reparations = java.util.Arrays.stream(r).filter(t -> maintenant - t < 3_600_000L).toArray();
                boolean repare = fait && poolOk();
                derniereReparation = maintenant;
                nombreReparations++;
                echecs = repare ? 0 : echecs;
                dernierEtat = repare ? "Pool réparé automatiquement (connexions mortes remplacées)"
                        : "Réparation du pool échouée"
                                + (fait ? "" : " (asadmin indisponible ou protégé par mot de passe)");
                noter("pool-repare-" + LocalDate.now(), repare ? "WARN" : "ERROR",
                        repare ? "Pool de connexions repare automatiquement" : "Reparation automatique du pool echouee",
                        "MariaDB repondait sur " + hp[0] + ":" + hp[1] + " mais le pool refusait de servir depuis "
                                + ECHECS_AVANT_REPARATION
                                + " minutes (connexions mortes, par exemple apres un redemarrage de"
                                + " MariaDB). Vidage du pool : " + (fait ? "fait" : "impossible")
                                + ". Conseil : activer le"
                                + " controle des connexions du pool (Stabilite du serveur > Reglages conseilles).");
                break;
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "PoolReparation.verifier", e);
        }
    }

    private static String nomDuPool() {
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        try {
            Path d = racine == null ? null : Paths.get(racine, "config", "domain.xml");
            if (d != null && Files.isRegularFile(d)) {
                rest.service.impl.serveur.ConfigPayara c = rest.service.impl.serveur.ConfigPayara
                        .lire(new String(Files.readAllBytes(d), java.nio.charset.StandardCharsets.UTF_8));
                if (StringUtils.isNotBlank(c.pool)) {
                    return c.pool;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "nom du pool", e);
        }
        return "laborex_pool";
    }

    /** Temps pour obtenir et utiliser une connexion du pool (ms), -1 en cas d'echec. */
    public long tempsReponseMs() {
        long t = System.nanoTime();
        return poolOk() ? (System.nanoTime() - t) / 1_000_000L : -1L;
    }

    /** Etat pour l'ecran de surveillance. */
    public java.util.Map<String, Object> etat() {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("etat", dernierEtat);
        m.put("echecsConsecutifs", echecs);
        m.put("derniereVerification", derniereVerification == 0 ? ""
                : new java.sql.Timestamp(derniereVerification).toString().substring(0, 19));
        m.put("derniereReparation",
                derniereReparation == 0 ? "" : new java.sql.Timestamp(derniereReparation).toString().substring(0, 19));
        m.put("reparationsDepuisDemarrage", nombreReparations);
        return m;
    }
}
