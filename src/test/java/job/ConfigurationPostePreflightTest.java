package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import config.AppConfig;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retour de l'utilisateur du 18/11 : sur chaque caisse d'appaul, D:\prestige\config\dicisms.properties dit «
 * application.mode=server », alors que le fichier de Documents dit « client ». Payara lit d'abord
 * &lt;profil&gt;\Documents ; tournant en service Windows sous un autre compte, il ne le voit plus et crée le fichier de
 * D: avec « server » par défaut. Le poste se déclare alors serveur sans que personne ne l'ait voulu.
 */
class ConfigurationPostePreflightTest {

    @Test
    void fichierCreeParDefautSelonLaBase() {
        assertEquals("server", AppConfig.modeParDefaut(true), "poste unique ou serveur : la base est ici");
        assertEquals("client", AppConfig.modeParDefaut(false), "caisse branchée sur la base du serveur");
    }

    @Test
    void caisseDeclareeServeurAlorsQueLaBaseEstAilleurs() {
        SupportPreflight.Controle c = SupportPreflight.evaluerConfigurationPoste(
                "D:\\prestige\\config\\dicisms.properties", "server", null, null, false, "SYSTEM");
        assertFalse(c.ok, c.detail);
        assertTrue(c.detail.contains("D:\\prestige\\config\\dicisms.properties"), c.detail);
        assertTrue(c.detail.contains("application.mode=client"), c.detail);
        assertTrue(c.detail.contains("SYSTEM"), c.detail);
    }

    @Test
    void deuxFichiersEnDesaccord() {
        SupportPreflight.Controle c = SupportPreflight.evaluerConfigurationPoste(
                "C:\\Users\\caisse\\Documents\\dicisms.properties", "client",
                "D:\\prestige\\config\\dicisms.properties", "server", false, "caisse");
        assertFalse(c.ok, c.detail);
        assertTrue(c.detail.contains("D:\\prestige\\config\\dicisms.properties"), c.detail);
    }

    @Test
    void configurationsSaines() {
        assertTrue(SupportPreflight.evaluerConfigurationPoste("D:\\prestige\\config\\dicisms.properties", "server",
                null, null, true, "SYSTEM").ok, "serveur qui héberge la base");
        assertTrue(
                SupportPreflight.evaluerConfigurationPoste("C:\\Users\\c\\Documents\\dicisms.properties", "client",
                        "D:\\prestige\\config\\dicisms.properties", "client", false, "c").ok,
                "caisse, deux fichiers d'accord");
    }

    /**
     * Cohérence (graine fixe, 3 000 cas) : anomalie si et seulement si le poste se dit serveur sans héberger la base,
     * ou si deux fichiers donnent des modes différents ; le détail nomme toujours le fichier lu, le mode et le compte.
     */
    @Test
    void reglesSurDesMilliersDeCas() {
        Random r = new Random(20261118L);
        String[] modes = { "server", "client" };
        int anomalies = 0, saines = 0;
        for (int i = 0; i < 3000; i++) {
            String mode = modes[r.nextInt(2)];
            boolean deux = r.nextBoolean();
            String autreMode = deux ? modes[r.nextInt(2)] : null;
            boolean baseLocale = r.nextBoolean();
            String lu = "C:\\Users\\p" + i + "\\Documents\\dicisms.properties";
            SupportPreflight.Controle c = SupportPreflight.evaluerConfigurationPoste(lu, mode,
                    deux ? "D:\\prestige\\config\\dicisms.properties" : null, autreMode, baseLocale, "compte" + i);
            boolean attendu = !("server".equals(mode) && !baseLocale) && !(deux && !mode.equals(autreMode));
            assertEquals(attendu, c.ok, "cas " + i + " : " + mode + "/" + autreMode + " base locale " + baseLocale);
            assertTrue(c.detail.contains(lu) && c.detail.contains(mode) && c.detail.contains("compte" + i), c.detail);
            if (c.ok) {
                saines++;
            } else {
                anomalies++;
            }
        }
        assertTrue(anomalies > 500 && saines > 500, anomalies + " / " + saines);
    }
}
