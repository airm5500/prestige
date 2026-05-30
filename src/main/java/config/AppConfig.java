package config;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.ejb.Singleton;
import javax.ejb.Startup;

/**
 *
 * @author koben
 */
@Singleton
@Startup
public class AppConfig {

    private static final Logger LOG = Logger.getLogger(AppConfig.class.getName());

    private final Properties properties = new Properties();

    private String applicationMode;
    private String modReappro;

    private static final String CONFIG_COMMENT = "Configuration de l'application\n"
            + "application.mode: server | client\n" + "reappro.mode: semois | default";

    @PostConstruct
    public void init() {

        String path = System.getProperty("user.home") + File.separator + "Documents" + File.separator
                + "dicisms.properties";

        File configFile = new File(path);

        if (!configFile.exists()) {
            createDefaultConfig(configFile);
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

    public boolean isServerMode() {
        return "server".equals(applicationMode);
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
