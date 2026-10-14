
package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;

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

    /** Attente maximale de MariaDB au demarrage (apres une coupure, elle peut mettre plusieurs minutes a s'ouvrir). */
    static final int ATTENTE_BASE_S = 180;

    /**
     * Apres une coupure de courant, Windows peut demarrer Payara avant que MariaDB n'accepte les connexions (reprise de
     * son journal). Sans attente, les migrations echouaient et l'application demarrait sans elles. On essaie toutes les
     * 5 secondes, 3 minutes au plus ; au-dela, on continue comme avant (le pool se reconnectera ensuite).
     */
    void attendreLaBase() {
        long fin = System.currentTimeMillis() + ATTENTE_BASE_S * 1000L;
        int essais = 0;
        while (true) {
            essais++;
            try (java.sql.Connection c = dataSource.getConnection(); java.sql.Statement st = c.createStatement()) {
                st.execute("SELECT 1");
                if (essais > 1) {
                    LOG.log(Level.INFO, "Base disponible apres {0} essai(s)", essais);
                }
                return;
            } catch (Exception e) {
                if (System.currentTimeMillis() >= fin) {
                    LOG.log(Level.SEVERE,
                            "Base indisponible depuis " + ATTENTE_BASE_S + " s : demarrage sans migrations", e);
                    return;
                }
                LOG.log(Level.WARNING, "Base pas encore disponible (essai {0}) : nouvel essai dans 5 s", essais);
                try {
                    Thread.sleep(5000L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    @PostConstruct
    public void migrate() {
        if (dataSource == null) {
            LOG.severe("No datasource found to execute the DB migrations!");
            throw new IllegalStateException("Datasource not found");
        }
        attendreLaBase();
        try {
            Flyway flyway = Flyway.configure().dataSource(dataSource).baselineOnMigrate(true)
                    .ignoreMissingMigrations(true).outOfOrder(true).cleanOnValidationError(true)
                    .validateOnMigrate(false).ignoreFutureMigrations(true).load();
            // Une migration qui a echoue laisse une trace d'echec dans flyway_schema_history, et
            // cette trace bloque toutes les migrations suivantes tant qu'elle n'est pas retiree.
            // repair() la retire au demarrage : le script corrige est alors rejoue normalement,
            // sans intervention manuelle en base. Les migrations deja reussies ne sont pas
            // touchees, et tous nos scripts sont ecrits pour etre rejouables sans effet de bord.
            // flyway.repair();
            flyway.migrate();
            LOG.info("Flyway migration completed");
        } catch (FlywayException e) {
            LOG.log(Level.SEVERE, "Flyway migration failed", e);
        }
    }

}
