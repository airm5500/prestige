package rest.service.impl;

import dal.BuildVersion;
import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import rest.service.v2.dto.VersionDTO;

/**
 *
 * @author koben
 */
// @Singleton
// @Startup
public class VersionService {

    // @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    // @PostConstruct
    public void init() {

        Properties props = new Properties();
        VersionDTO version = new VersionDTO();
        try (InputStream resourceStream = getClass().getClassLoader().getResourceAsStream("build.properties")) {
            props.load(resourceStream);
            version.setVersion(props.getProperty("laborex.version"));
            version.setDate(props.getProperty("build.time"));
            version.setUser(props.getProperty("user.name"));
            version.setJdkVersion(props.getProperty("java.runtime.version"));
            Utils.version = version;
            update();
        } catch (IOException ex) {
            Logger.getLogger(VersionService.class.getName()).log(Level.SEVERE, null, ex.getMessage());
        }
    }

    private void update() {
        VersionDTO version = Utils.version;
        if (Objects.nonNull(version)) {
            try {

                BuildVersion buildVersion = em.find(BuildVersion.class, version.getDate());
                if (Objects.isNull(buildVersion)) {
                    buildVersion = new BuildVersion();
                    buildVersion.setBuildDate(version.getDate());
                    buildVersion.setJdkVersion(version.getJdkVersion());
                    buildVersion.setVersion(version.getVersion());
                    buildVersion.setBuilder(version.getUser());
                    em.persist(buildVersion);
                }

            } catch (Exception e) {
                Logger.getLogger(VersionService.class.getName()).log(Level.INFO, null, e.getMessage());
            }
        }
    }
}
