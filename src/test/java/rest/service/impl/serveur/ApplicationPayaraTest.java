package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ApplicationPayara.Commande;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

class ApplicationPayaraTest {

    private static final String VIDAGES = "D:/prestige/support/dumps",
            LOGS = "D:/payara5/glassfish/domains/domain1/logs";

    private static List<Reglage> reglages() {
        ConfigPayara c = ConfigPayara.lire(ConfigPayaraTest.DOMAIN);
        return c.comparer(Arrays.asList("-Xmx2g"), 3 * ReglagesServeur.GO, true, true, VIDAGES, LOGS);
    }

    private static Reglage r(List<Reglage> l, String cle) {
        return l.stream().filter(x -> x.cle.equals(cle)).findFirst().orElseThrow();
    }

    @Test
    void commandesDesReglagesAAjusterSeulement() {
        List<Commande> l = ApplicationPayara.commandes(reglages(), null);
        assertTrue(l.stream().anyMatch(c -> c.arguments.equals(Arrays.asList("set",
                "configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size=100"))));
        assertTrue(l.stream().anyMatch(c -> c.arguments.equals(Arrays.asList("create-jvm-options", "-Xmx3g"))));
        assertTrue(l.stream().anyMatch(c -> c.arguments.equals(Arrays.asList("delete-jvm-options", "-Xmx2g"))));
        assertTrue(l.stream().anyMatch(c -> c.arguments
                .equals(Arrays.asList("create-jvm-options", "-XX\\:HeapDumpPath=D\\:/prestige/support/dumps"))));
        assertTrue(l.stream().anyMatch(c -> c.arguments.equals(Arrays.asList("set",
                "resources.jdbc-connection-pool.laborex_pool.property.url=jdbc:mariadb://127.0.0.1:3306/capitale?useUnicode=true&characterEncoding=UTF-8"))),
                "adresse de la base : 127.0.0.1, guillemets retires");
        for (Commande c : l) {
            assertTrue(ApplicationPayara.autorisee(c.arguments), c.arguments.toString());
        }
    }

    @Test
    void choixDesReglages() {
        List<Commande> l = ApplicationPayara.commandes(reglages(),
                new HashSet<>(Arrays.asList("http-thread-pool", "surveillance", "rm -rf")));
        assertEquals(3, l.size(), "fils HTTP + deux niveaux de surveillance");
        assertTrue(l.stream().allMatch(c -> c.cle.equals("http-thread-pool") || c.cle.equals("surveillance")));
    }

    @Test
    void reglageCorrectIgnore() {
        List<Reglage> l = reglages();
        r(l, "http-thread-pool").niveau = Niveau.OK;
        assertTrue(ApplicationPayara.commandes(l, null).stream().noneMatch(c -> c.cle.equals("http-thread-pool")));
    }

    @Test
    void listeFermeeJamaisDeCommandeLibre() {
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("deploy", "x.war")));
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("set", "configs.config.server-config.foo=1")));
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("set",
                "configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size=100 & del")));
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("set",
                "resources.jdbc-connection-pool.laborex_pool.property.url=jdbc:mariadb://<IP_DU_SERVEUR>:3306/x")));
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("set",
                "resources.jdbc-connection-pool.laborex_pool.property.url=jdbc:mariadb://127.0.0.1/x?a=%PATH%")));
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("create-jvm-options", "-Dpassword=x")));
        assertFalse(ApplicationPayara.autorisee(Arrays.asList("create-jvm-options", "-Xmx3g", "-Xms3g")));
        assertFalse(ApplicationPayara
                .autorisee(Arrays.asList("set", "resources.jdbc-connection-pool.laborex_pool.password=x")));
        /* une ligne de reglage alteree n'est pas executee */
        List<Reglage> l = reglages();
        r(l, "pool-fuite").ligne = "asadmin set resources.jdbc-connection-pool.laborex_pool.connection-leak-timeout-in-seconds=300\n"
                + "asadmin stop-domain domain1";
        List<Commande> c = ApplicationPayara.commandes(l, Collections.singleton("pool-fuite"));
        assertTrue(c.isEmpty(), "reglage entier ecarte si une de ses lignes n'est pas autorisee");
    }

    @Test
    void domaineEtPortAdmin() {
        ApplicationPayara.Domaine d = ApplicationPayara.domaine("D:\\payara5\\payara5\\glassfish\\domains\\domain2",
                "<config name=\"server-config\"><network-config><network-listeners>"
                        + "<network-listener protocol=\"admin-listener\" port=\"9048\" name=\"admin-listener\" thread-pool=\"admin-thread-pool\"></network-listener>"
                        + "</network-listeners></network-config></config>");
        assertEquals("domain2", d.nom);
        assertEquals("D:/payara5/payara5/glassfish/domains", d.dossierDomaines);
        assertEquals(9048, d.portAdmin);
        assertEquals(4848, ApplicationPayara.domaine("C:/p/domains/domain1", "").portAdmin, "defaut");
    }

    @Test
    void scriptDetache() {
        ApplicationPayara.Domaine d = ApplicationPayara.domaine("D:/payara5/glassfish/domains/domain2", "");
        List<Commande> l = ApplicationPayara.commandes(reglages(), Collections.singleton("http-thread-pool"));
        String s = ApplicationPayara.script(l, d, "D:/payara5/glassfish/bin/asadmin.bat",
                "D:/prestige/support/payara-1.log");
        assertTrue(s.startsWith("@echo off\r\n"), s);
        assertTrue(s.contains("call \"D:/payara5/glassfish/bin/asadmin.bat\" --interactive=false --port 4848 set "
                + "configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size=100"
                + " >> \"D:/prestige/support/payara-1.log\" 2>&1\r\n"), s);
        assertTrue(s.contains("restart-domain --domaindir \"D:/payara5/glassfish/domains\" domain2"),
                "le domaine en cours, pas domain1");
        assertFalse(s.contains("domain1"));
        assertTrue(s.contains("echo FIN"), "fin de script reperable dans le journal");
    }

    @Test
    void motDePasseOuDroitManquant() {
        assertTrue(ApplicationPayara.motDePasseDemande("Authentication failed for user: admin"));
        assertTrue(ApplicationPayara.motDePasseDemande("Enter admin password for user \"admin\">"));
        assertTrue(ApplicationPayara.motDePasseDemande("Remote server requires a password"));
        assertFalse(ApplicationPayara.motDePasseDemande(
                "configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size=5\nCommand get executed successfully."));
    }

    @Test
    void verificationAuRetour() {
        Map<String, String> attendu = ApplicationPayara.attendu(ApplicationPayara.commandes(reglages(), null),
                reglages());
        assertEquals("100", attendu.get("http-thread-pool"));
        List<Reglage> apres = reglages();
        r(apres, "http-thread-pool").niveau = Niveau.OK;
        r(apres, "http-thread-pool").actuel = "100";
        List<ApplicationPayara.Verification> v = ApplicationPayara.verifier(attendu, apres);
        ApplicationPayara.Verification fils = v.stream().filter(x -> x.cle.equals("http-thread-pool")).findFirst()
                .get();
        assertTrue(fils.pris);
        assertEquals("100", fils.actuel);
        assertFalse(v.stream().filter(x -> x.cle.equals("pool-fuite")).findFirst().get().pris);
        assertNull(ApplicationPayara.verifier(attendu, Collections.emptyList()).stream().filter(x -> x.pris).findFirst()
                .orElse(null), "Payara illisible : rien de pris");
    }
}
