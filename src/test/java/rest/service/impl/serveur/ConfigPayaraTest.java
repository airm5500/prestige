package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

class ConfigPayaraTest {

    /** Extrait du domain.xml installe (pool et fils sans attributs : valeurs par defaut de Payara). */
    static final String DOMAIN = "<domain><resources>"
            + "<jdbc-connection-pool datasource-classname=\"org.mariadb.jdbc.MariaDbDataSource\" name=\"laborex_pool\" res-type=\"javax.sql.DataSource\">"
            + "<property name=\"password\" value=\"secret\"></property>"
            + "<property name=\"url\" value=\"jdbc:mariadb://PC-OFFICINE:3306/capitale?useUnicode=true&amp;characterEncoding=UTF-8\"></property></jdbc-connection-pool>"
            + "<jdbc-resource pool-name=\"laborex_pool\" jndi-name=\"jdbc/__laborex_pool\"></jdbc-resource></resources><configs>"
            + "<config name=\"server-config\"><java-config><jvm-options>-server</jvm-options><jvm-options>-Xmx2g</jvm-options></java-config>"
            + "<thread-pools><thread-pool name=\"admin-thread-pool\" max-thread-pool-size=\"15\"></thread-pool>"
            + "<thread-pool name=\"http-thread-pool\"></thread-pool></thread-pools>"
            + "<monitoring-service><module-monitoring-levels></module-monitoring-levels></monitoring-service></config>"
            + "<config name=\"default-config\"><thread-pools><thread-pool name=\"http-thread-pool\" max-thread-pool-size=\"200\"></thread-pool>"
            + "</thread-pools></config></configs></domain>";

    private static Reglage r(List<Reglage> l, String cle) {
        return l.stream().filter(x -> x.cle.equals(cle)).findFirst().orElseThrow();
    }

    @Test
    void lectureDuDomaine() {
        ConfigPayara c = ConfigPayara.lire(DOMAIN);
        assertTrue(c.lu);
        assertEquals("laborex_pool", c.pool);
        assertEquals(5, c.filsHttpMax, "défaut de Payara, pas la valeur de default-config");
        assertEquals(32, c.poolMax);
        assertFalse(c.poolValidation);
        assertEquals("OFF", c.niveauSurveillancePool);
        assertEquals(Arrays.asList("-server", "-Xmx2g"), c.optionsJvm);
        assertFalse(ConfigPayara.lire("").lu);
    }

    @Test
    void reglagesConseillesPour20Postes() {
        ConfigPayara c = ConfigPayara.lire(DOMAIN);
        List<Reglage> l = c.comparer(Arrays.asList("-Xmx2g", "-server"), 3 * ReglagesServeur.GO, 20,
                "D:/prestige/support/dumps", "D:/payara5/glassfish/domains/domain1/logs");
        assertEquals(Niveau.CRITIQUE, r(l, "http-thread-pool").niveau);
        assertEquals("100", r(l, "http-thread-pool").conseille, "serveur");
        assertTrue(r(l, "http-thread-pool").ligne.endsWith("max-thread-pool-size=100"));
        assertEquals(Niveau.A_AJUSTER, r(l, "pool-validation").niveau);
        assertEquals(Niveau.A_AJUSTER, r(l, "pool-reprise").niveau);
        assertEquals("PC-OFFICINE", r(l, "pool-adresse").actuel);
        assertEquals(Niveau.A_AJUSTER, r(l, "pool-adresse").niveau);
        assertTrue(
                r(l, "pool-adresse").ligne.contains(
                        "property.url=jdbc:mariadb://127.0.0.1:3306/capitale?useUnicode=true&characterEncoding=UTF-8"),
                r(l, "pool-adresse").ligne);
        assertFalse(r(l, "pool-adresse").ligne.contains("secret"));
        assertTrue(r(l, "Xms").ligne.contains("delete-jvm-options -Xmx2g")
                && r(l, "Xms").ligne.contains("create-jvm-options -Xms3g"));
        assertEquals(Niveau.A_AJUSTER, r(l, "Xms").niveau);
        /* -Xms = -Xmx mais trop petits : a corriger quand meme */
        assertEquals(Niveau.CRITIQUE,
                r(c.comparer(Arrays.asList("-Xmx1g", "-Xms1g"), 3 * ReglagesServeur.GO, 20, "D:/d", "D:/l"),
                        "Xms").niveau);
        assertTrue(r(l, "HeapDumpOnOutOfMemoryError").ligne.contains("-XX\\:HeapDumpPath=D\\:/prestige/support/dumps"),
                r(l, "HeapDumpOnOutOfMemoryError").ligne);
        assertTrue(r(l, "gc-log").ligne.contains("-Xlog\\:gc*\\:file=D\\:/payara5"), r(l, "gc-log").ligne);
        String script = ConfigPayara.script(l);
        assertTrue(script.contains("call asadmin set configs.config.server-config.thread-pools")
                && script.endsWith("call asadmin restart-domain domain1\n"));
        assertFalse(script.contains("secret"));
    }

    @Test
    void posteDeCaisse() {
        ConfigPayara c = ConfigPayara.lire(DOMAIN);
        List<Reglage> l = c.comparer(Arrays.asList("-Xmx2g"), 2 * ReglagesServeur.GO, false, false, "D:/d", "D:/l");
        assertEquals("50", r(l, "http-thread-pool").conseille);
        assertEquals(Niveau.A_AJUSTER, r(l, "pool-adresse").niveau, "nom d'ordinateur");
        assertTrue(r(l, "pool-adresse").ligne.contains("//<IP_DU_SERVEUR>:3306"), r(l, "pool-adresse").ligne);
        ConfigPayara ip = ConfigPayara.lire(DOMAIN.replace("PC-OFFICINE", "192.168.1.10"));
        assertEquals(Niveau.OK,
                r(ip.comparer(Arrays.asList("-Xmx2g"), 2 * ReglagesServeur.GO, false, false, "D:/d", "D:/l"),
                        "pool-adresse").niveau);
        assertTrue(ConfigPayara.locale("localhost", "X") && ConfigPayara.locale("pc-officine", "PC-OFFICINE")
                && !ConfigPayara.locale("192.168.1.10", "PC-OFFICINE"));
    }

    @Test
    void reglagesEnPlace() {
        ConfigPayara c = ConfigPayara.lire(DOMAIN.replace(
                "<thread-pool name=\"http-thread-pool\"></thread-pool></thread-pools>",
                "<thread-pool name=\"http-thread-pool\" max-thread-pool-size=\"120\"></thread-pool></thread-pools>"));
        List<Reglage> l = c.comparer(
                Arrays.asList("-Xmx3g", "-Xms3g", "-XX:+HeapDumpOnOutOfMemoryError", "-XX:HeapDumpPath=D:/d",
                        "-XX:ErrorFile=D:/d/hs_err_pid%p.log", "-Xlog:gc*:file=x"),
                3 * ReglagesServeur.GO, 20, "D:/d", "D:/l");
        for (String k : new String[] { "http-thread-pool", "Xms", "HeapDumpOnOutOfMemoryError", "ErrorFile",
                "gc-log" }) {
            assertEquals(Niveau.OK, r(l, k).niveau, k);
        }
    }
}
