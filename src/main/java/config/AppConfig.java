package config;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 *
 * @author koben
 */
@Singleton
@Startup
@Lock(LockType.READ)
public class AppConfig {

    private static final Logger LOG = Logger.getLogger(AppConfig.class.getName());

    private final Properties properties = new Properties();

    private String applicationMode;
    private String modReappro;

    /**
     * Un seul serveur par reseau (retour du 03/11) : un poste configure en serveur qui n'heberge pas la base, alors que
     * la machine qui l'heberge est connue comme serveur (t_serveur_poste), ne lance pas les taches planifiees. Decision
     * revue toutes les {@link #REVUE_MS} ms ; dans le doute (table absente, base injoignable), rien ne change.
     */
    static final long REVUE_MS = 10 * 60 * 1000L;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private volatile Boolean tachesIci;
    private volatile long revueA;
    private volatile boolean signale;

    private static final String CONFIG_COMMENT = "Configuration de l'application\n"
            + "application.mode: server | client\n" + "reappro.mode: semois | default";

    @PostConstruct
    public void init() {

        // Emplacement historique (profil utilisateur) : conserve s'il existe deja, pour ne rien casser
        // sur les installations en place. Sinon on cree la configuration sur le disque de donnees
        // (D: puis F: puis E:), accessible en ecriture par le compte de service Windows.
        File configFile = new File(
                System.getProperty("user.home") + File.separator + "Documents" + File.separator + "dicisms.properties");

        if (!configFile.exists()) {
            configFile = util.StockageDisque.sousDossier("config").resolve("dicisms.properties").toFile();
            if (!configFile.exists()) {
                createDefaultConfig(configFile);
            }
        }

        try (InputStream in = new FileInputStream(configFile)) {

            properties.load(in);

            boolean modified = false;

            if (properties.getProperty("application.mode") == null) {
                properties.setProperty("application.mode", "server"); // server/client
                modified = true;
            }
            if (properties.getProperty("reappro.mode") == null) {
                properties.setProperty("reappro.mode", "default"); // semois/default
                modified = true;
            }

            if (modified) {
                saveConfig(configFile);
            }

            applicationMode = properties.getProperty("application.mode");
            modReappro = properties.getProperty("reappro.mode");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Unable to load configuration file", e);
        }
    }

    private void createDefaultConfig(File file) {
        Properties defaults = new Properties();
        defaults.setProperty("application.mode", "server"); // server/client
        defaults.setProperty("reappro.mode", "default"); // semois/default
        try (FileOutputStream out = new FileOutputStream(file)) {
            defaults.store(out, CONFIG_COMMENT);
            LOG.log(Level.INFO, "Default configuration file created at: {0}", file.getAbsolutePath());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Unable to create default configuration file", e);
        }
    }

    private void saveConfig(File file) {
        try (FileOutputStream out = new FileOutputStream(file)) {
            properties.store(out, CONFIG_COMMENT);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Unable to save configuration file", e);
        }
    }

    /**
     * Ce poste lance-t-il les taches du serveur ? Configure en serveur (application.mode) et, s'il n'heberge pas la
     * base, aucune autre machine connue comme le vrai serveur (voir {@link #estDeclareServeur()} pour le mode saisi).
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public boolean isServerMode() {
        if (!estDeclareServeur()) {
            return false;
        }
        Boolean t = tachesIci;
        if (t == null || System.currentTimeMillis() >= revueA) {
            t = revoir();
        }
        return t;
    }

    /** Mode saisi dans dicisms.properties, tel quel (releve du poste, alertes de l'ecran « Postes »). */
    public boolean estDeclareServeur() {
        return "server".equals(applicationMode);
    }

    private boolean revoir() {
        boolean t = true;
        try {
            String hote;
            try {
                hote = java.net.InetAddress.getLocalHost().getHostName(); // comme le releve du poste (SupportWatchdog)
            } catch (java.io.IOException e) {
                hote = job.PosteLocal.nomMachine();
            }
            if (!rest.service.impl.serveur.CalculReglages.baseLocale(hote)) {
                Number n = (Number) em
                        .createNativeQuery("SELECT COUNT(*) FROM t_serveur_poste WHERE serveur = 1"
                                + " AND mariadb_locale = 1 AND hote <> ? AND releve_at > NOW() - INTERVAL 30 DAY")
                        .setParameter(1, hote).getSingleResult();
                t = rest.service.impl.serveur.PostesReglages.tachesDuServeurIci(true, false, n.longValue() > 0);
            }
        } catch (Exception e) {
            t = true;
        }
        if (!t && !signale) {
            signale = true;
            LOG.warning("application.mode=server, mais la base est sur une autre machine connue comme serveur :"
                    + " ce poste est une caisse, les taches planifiees n'y sont pas lancees."
                    + " Mettez application.mode=client dans son dicisms.properties.");
        }
        tachesIci = t;
        revueA = System.currentTimeMillis() + REVUE_MS;
        return t;
    }

    public boolean isDefaultReapproMode() {
        return "default".equals(modReappro);
    }

    public boolean isSemoisReapproMode() {
        return "semois".equals(modReappro);
    }

    public String getModReappro() {
        return modReappro;
    }

    public String getApplicationMode() {
        return applicationMode;
    }

}
