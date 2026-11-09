package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Plan avoir du 08/11, point 9 : « Configuration détaillée » des comptes WhatsApp. Mode de démarrage (1 : service
 * Windows prestige-whatsapp, 2 : lancement direct par demarrer.bat), état du service Windows, dossier, journaux et
 * étapes de chaque mode. Aucun jeton.
 */
public class ConfigurationWhatsAppWebTest {

    private static final String SC_QUERY = "\r\nSERVICE_NAME: prestige-whatsapp \r\n"
            + "        TYPE               : 10  WIN32_OWN_PROCESS  \r\n"
            + "        STATE              : 4  RUNNING \r\n"
            + "                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)\r\n";

    @Test
    public void etatDuServiceWindows() {
        assertEquals("RUNNING", LancementServiceWhatsApp.etatServiceWindows(SC_QUERY));
        assertEquals("STOPPED",
                LancementServiceWhatsApp.etatServiceWindows(SC_QUERY.replace("4  RUNNING", "1  STOPPED")));
        assertNull(
                LancementServiceWhatsApp.etatServiceWindows("[SC] EnumQueryServicesStatus:OpenService échec(s) 1060"));
    }

    @Test
    public void journauxDuServiceWindowsLusDansSaConfiguration(@TempDir Path installe) throws IOException {
        assertEquals(WhatsAppCompte.DEFAUT_WEB_REPERTOIRE + File.separator + "journaux",
                LancementServiceWhatsApp.journauxService(installe.toFile()),
                "sans fichier xml : le dossier par défaut");
        Files.createDirectories(installe.resolve("service-windows"));
        Files.write(installe.resolve("service-windows").resolve("prestige-whatsapp.xml"),
                "<service>\n  <id>prestige-whatsapp</id>\n  <logpath>D:\\wa\\logs</logpath>\n</service>\n"
                        .getBytes(StandardCharsets.UTF_8));
        assertEquals("D:\\wa\\logs", LancementServiceWhatsApp.journauxService(installe.toFile()));
    }

    @Test
    public void mode1ParLeServiceWindows(@TempDir Path installe) throws IOException {
        JSONObject c = LancementServiceWhatsApp.configuration(true, installe.toFile(), "RUNNING", installe.toString());
        assertEquals(1, c.getInt("mode"));
        assertEquals("Par service Windows", c.getString("modeLibelle"));
        JSONObject s = c.getJSONObject("serviceWindows");
        assertTrue(s.getBoolean("installe"));
        assertEquals("prestige-whatsapp", s.getString("nom"));
        assertEquals("RUNNING", s.getString("etat"));
        assertEquals(installe.toFile().getAbsolutePath(), s.getString("dossier"));
        assertEquals(installe.toString(), c.getString("dossier"));
        assertEquals(WhatsAppCompte.DEFAUT_WEB_REPERTOIRE + File.separator + "journaux", c.getString("journaux"));
        etapes(c);
    }

    @Test
    public void mode2ParLancementDirect(@TempDir Path essai) throws IOException {
        File d = LancementServiceWhatsAppTest.compagnon(essai);
        /* un service Windows installe ailleurs : une instance d'essai garde son script */
        File ailleurs = new File(System.getProperty("java.io.tmpdir"), "prestige-wa-installe");
        JSONObject c = LancementServiceWhatsApp.configuration(true, ailleurs, "STOPPED", d.getPath());
        assertEquals(2, c.getInt("mode"));
        assertEquals("Par lancement direct", c.getString("modeLibelle"));
        assertEquals(LancementServiceWhatsApp.journalDirect(d).getPath(), c.getString("journaux"));
        assertTrue(c.getJSONObject("serviceWindows").getBoolean("installe"));
        /* aucun service installe */
        JSONObject sans = LancementServiceWhatsApp.configuration(true, null, null, d.getPath());
        assertEquals(2, sans.getInt("mode"));
        assertFalse(sans.getJSONObject("serviceWindows").getBoolean("installe"));
        assertEquals("", sans.getJSONObject("serviceWindows").getString("etat"));
        /* hors Windows : toujours le lancement direct */
        assertEquals(2, LancementServiceWhatsApp.configuration(false, null, null, d.getPath()).getInt("mode"));
        etapes(sans);
    }

    @Test
    public void dossierInconnu() {
        JSONObject c = LancementServiceWhatsApp.configuration(true, null, null, "  ");
        assertEquals(2, c.getInt("mode"));
        assertEquals("", c.getString("dossier"));
        assertEquals("", c.getString("journaux"), "pas de dossier : pas de journal connu");
    }

    /** Étapes des deux modes, toujours rendues ; aucun jeton dans la configuration. */
    private static void etapes(JSONObject c) {
        JSONArray un = c.getJSONArray("etapesService"), deux = c.getJSONArray("etapesDirect");
        assertTrue(un.length() >= 4 && deux.length() >= 3, c.toString());
        assertTrue(un.toString().contains("installer-service.bat") && un.toString().contains("arreter-service.bat"));
        assertTrue(deux.toString().contains("demarrer.bat") && deux.toString().contains("arreter.bat")
                && deux.toString().contains("sans fenêtre"));
        String tout = c.toString().toLowerCase();
        assertFalse(tout.contains("\"jeton\"") || tout.contains("webjeton") || tout.contains("token"), tout);
    }
}
