package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ConfigPayara;
import rest.service.impl.serveur.ReglagesServeur;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * Retour support du 18/11 (R3) : sur CAISSE44, « Communications link failure, the last packet successfully received
 * from the server was 219 722 milliseconds ago » (17/11 16:38 → 18/11 14:07). Une connexion au repos coupee entre la
 * caisse et le serveur etait encore distribuee par le pool : le reglage du pool (1-configurer-payara.ps1 -PoolSeulement
 * : verification avant emploi, delais de connexion et de lecture, tcpKeepAlive) n'avait ete passe sur aucune caisse, et
 * l'auto-diagnostic ne le montrait pas. Il doit lever une ANOMALIE qui dit quoi passer sur le poste.
 */
class PoolVerifiePreflightTest {

    /** Pool tel qu'a appaul : serverName seul, ni verification ni delais. */
    private static String domaine(String attributs, String proprietes) {
        return "<domain><resources><jdbc-connection-pool name=\"laborex_pool\" datasource-classname=\"x\"" + attributs
                + "><property name=\"serverName\" value=\"192.168.1.91\"></property>"
                + "<property name=\"password\" value=\"secret\"></property>" + proprietes + "</jdbc-connection-pool>"
                + "<jdbc-resource pool-name=\"laborex_pool\" jndi-name=\"jdbc/__laborex_pool\"></jdbc-resource>"
                + "</resources><configs><config name=\"server-config\"><thread-pools></thread-pools></config></configs>"
                + "</domain>";
    }

    private static final String VERIFIE = " is-connection-validation-required=\"true\""
            + " connection-validation-method=\"custom-validation\"";

    private static String proprietes(int connexion, int lecture, Boolean maintien) {
        return (connexion < 0 ? "" : "<property name=\"connectTimeout\" value=\"" + connexion + "\"></property>")
                + (lecture < 0 ? "" : "<property name=\"socketTimeout\" value=\"" + lecture + "\"></property>")
                + (maintien == null ? "" : "<property name=\"tcpKeepAlive\" value=\"" + maintien + "\"></property>");
    }

    private static final String REGLE = domaine(VERIFIE, proprietes(5000, 600000, true));

    private static SupportPreflight.Controle controle(String xml) {
        return SupportPreflight.evaluerPool(ConfigPayara.lire(xml));
    }

    private static Reglage r(List<Reglage> l, String cle) {
        return l.stream().filter(x -> x.cle.equals(cle)).findFirst().orElseThrow(() -> new AssertionError(cle));
    }

    private static List<Reglage> reglages(String xml) {
        return ConfigPayara.lire(xml).comparer(Arrays.asList("-Xmx2g"), 2 * ReglagesServeur.GO, false, false, "D:/d",
                "D:/l");
    }

    @Test
    void poolDAppaulSansReglageEstUneAnomalie() {
        SupportPreflight.Controle c = controle(domaine("", ""));
        assertFalse(c.ok, "pool d'origine : anomalie");
        assertEquals("POOL", c.code);
        for (String attendu : new String[] { "verification avant emploi", "delai de connexion", "delai de lecture",
                "tcpKeepAlive", ConfigPayara.COMMANDE_POOL }) {
            assertTrue(c.detail.substring(c.detail.indexOf("manque : ")).contains(attendu), attendu + " / " + c.detail);
        }
        assertFalse(c.detail.contains("secret"), "jamais le mot de passe");
    }

    @Test
    void poolRegleParLeScriptEstOk() {
        SupportPreflight.Controle c = controle(REGLE);
        assertTrue(c.ok, c.detail);
        assertTrue(c.detail.contains("600000 ms") && c.detail.contains("5000 ms"), c.detail);
    }

    @Test
    void chaqueReglageManquantSeulEstNomme() {
        Object[][] cas = { { domaine("", proprietes(5000, 600000, true)), "verification avant emploi" },
                { domaine(VERIFIE, proprietes(-1, 600000, true)), "delai de connexion" },
                { domaine(VERIFIE, proprietes(0, 600000, true)), "delai de connexion" },
                { domaine(VERIFIE, proprietes(5000, -1, true)), "delai de lecture" },
                { domaine(VERIFIE, proprietes(5000, 0, true)), "delai de lecture" },
                { domaine(VERIFIE, proprietes(5000, 30000, true)), "delai de lecture trop court" },
                { domaine(VERIFIE, proprietes(5000, 600000, null)), "tcpKeepAlive" },
                { domaine(VERIFIE, proprietes(5000, 600000, false)), "tcpKeepAlive" } };
        for (Object[] x : cas) {
            SupportPreflight.Controle c = controle((String) x[0]);
            assertFalse(c.ok, (String) x[1]);
            assertTrue(c.detail.contains("manque : " + x[1]), x[1] + " / " + c.detail);
            assertEquals(1, ConfigPayara.lire((String) x[0]).manquesPool().size(), x[1] + " seul");
        }
    }

    @Test
    void domaineIlisibleNeDonnePasDeFausseAlerte() {
        assertTrue(controle("").ok);
        assertTrue(controle("<domain></domain>").ok);
    }

    @Test
    void ongletReglagesMontreLesDelais() {
        Reglage manque = r(reglages(domaine(VERIFIE, "")), "pool-delais");
        assertEquals(Niveau.A_AJUSTER, manque.niveau);
        assertTrue(manque.ligne.contains("property.socketTimeout=600000")
                && manque.ligne.contains("property.connectTimeout=5000")
                && manque.ligne.contains("property.tcpKeepAlive=true"), manque.ligne);
        assertEquals(Niveau.OK, r(reglages(REGLE), "pool-delais").niveau);
    }

    /**
     * Coherence (graine fixe, 4 000 pools) : anomalie de l'auto-diagnostic ⇔ un reglage manque ⇔ l'onglet Reglages
     * montre « Controle des connexions » ou « Delais » a ajuster ; chaque manque est nomme, aucun autre.
     */
    @Test
    void memeVerdictPartoutSurDesMilliersDePools() {
        Random r = new Random(20261119L);
        int anomalies = 0, regles = 0;
        for (int i = 0; i < 4000; i++) {
            boolean verif = r.nextInt(4) > 0;
            int connexion = new int[] { -1, 0, 1000, 5000, 15000 }[r.nextInt(5)];
            int lecture = new int[] { -1, 0, 30000, 59999, 60000, 600000 }[r.nextInt(6)];
            Boolean maintien = new Boolean[] { null, false, true, true }[r.nextInt(4)];
            String xml = domaine(verif ? VERIFIE : "", proprietes(connexion, lecture, maintien));
            int attendus = (verif ? 0 : 1) + (connexion > 0 ? 0 : 1) + (lecture >= 60000 ? 0 : 1)
                    + (Boolean.TRUE.equals(maintien) ? 0 : 1);
            String cas = "cas " + i + " : verif=" + verif + " connexion=" + connexion + " lecture=" + lecture
                    + " maintien=" + maintien;
            SupportPreflight.Controle c = controle(xml);
            List<Reglage> l = reglages(xml);
            boolean ongletAjuster = r(l, "pool-validation").niveau != Niveau.OK
                    || r(l, "pool-delais").niveau != Niveau.OK;
            assertEquals(attendus, ConfigPayara.lire(xml).manquesPool().size(), cas);
            assertEquals(attendus == 0, c.ok, cas);
            assertEquals(!c.ok, ongletAjuster, cas);
            assertEquals(!verif, r(l, "pool-validation").niveau != Niveau.OK, cas);
            assertEquals(!c.ok, c.detail.contains(ConfigPayara.COMMANDE_POOL), cas);
            if (c.ok) {
                regles++;
            } else {
                anomalies++;
            }
        }
        assertTrue(anomalies > 2500 && regles > 100, anomalies + "/" + regles);
    }
}
