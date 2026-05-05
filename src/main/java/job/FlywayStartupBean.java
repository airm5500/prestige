
package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;

/**
 *
 * @author koben
 */
@Singleton
@Startup
public class FlywayStartupBean {

    @Resource(mappedName = "jdbc/__laborex_pool")
    private DataSource dataSource;

    private static final Logger LOG = Logger.getLogger(FlywayStartupBean.class.getName());

    @PostConstruct
    public void migrate() {
        if (dataSource == null) {
            LOG.severe("No datasource found to execute the DB migrations!");
            throw new IllegalStateException("Datasource not found");
        }
        try {
            Flyway flyway = Flyway.configure().dataSource(dataSource).baselineOnMigrate(true)
                    .ignoreMissingMigrations(true).outOfOrder(true).cleanOnValidationError(true)
                    .validateOnMigrate(false).ignoreFutureMigrations(true).load();
            flyway.migrate();
            LOG.info("Flyway migration completed");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Flyway migration failed", e);
        }
    }

}
