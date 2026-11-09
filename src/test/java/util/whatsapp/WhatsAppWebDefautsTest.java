package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan avoir du 08/11, point 9 : une nouvelle installation recoit « Adresse du service » = http://localhost:3010 et «
 * Dossier du service » = C:\prestige\whatsapp-web en vraies valeurs. Les valeurs de Prestige sont celles du service
 * compagnon (config.exemple.json, service Windows) ; la migration ne touche qu'un compte Web jamais configure. Le
 * passage en base (nouvelle installation contre installation existante) est rejoue par
 * src/test/e2e/retours/test-whatsapp-web-configuration.js.
 */
public class WhatsAppWebDefautsTest {

    private static final Path MIGRATION = Paths
            .get("src/main/resources/db/migration/V7.2.100__whatsapp_web_defauts.sql");

    private static String lire(String chemin) throws IOException {
        return new String(Files.readAllBytes(Paths.get(chemin)), StandardCharsets.UTF_8);
    }

    @Test
    public void valeursParDefaut() {
        assertEquals("http://localhost:3010", WhatsAppCompte.DEFAUT_WEB_URL);
        assertEquals("C:\\prestige\\whatsapp-web", WhatsAppCompte.DEFAUT_WEB_REPERTOIRE);
    }

    @Test
    public void memesValeursQueLeServiceCompagnon() throws IOException {
        JSONObject exemple = new JSONObject(lire("outils/whatsapp-web/config.exemple.json"));
        assertEquals(URI.create(WhatsAppCompte.DEFAUT_WEB_URL).getPort(), exemple.getInt("PORT"),
                "port de config.exemple.json");
        assertEquals(WhatsAppCompte.DEFAUT_WEB_REPERTOIRE.replace('\\', '/'), exemple.getString("DOSSIER"),
                "dossier de config.exemple.json");
        assertTrue(lire("outils/whatsapp-web/service-windows/prestige-whatsapp.xml")
                .contains(WhatsAppCompte.DEFAUT_WEB_REPERTOIRE + "\\config.json"), "dossier du service Windows");
    }

    @Test
    public void migrationPourUnCompteJamaisConfigure() throws IOException {
        assertTrue(Files.isRegularFile(MIGRATION), "migration " + MIGRATION);
        String sql = new String(Files.readAllBytes(MIGRATION), StandardCharsets.UTF_8).replaceAll("--[^\n]*", "")
                .replaceAll("\\s+", " ");
        Matcher m = Pattern.compile("UPDATE whatsapp_compte SET (.*?) WHERE (.*?);").matcher(sql);
        assertTrue(m.find(), sql);
        String valeurs = m.group(1).replace(" ", ""), condition = m.group(2);
        assertTrue(valeurs.contains("web_url='" + WhatsAppCompte.DEFAUT_WEB_URL + "'"), valeurs);
        /* barre oblique inverse par CHAR(92) : juste quel que soit NO_BACKSLASH_ESCAPES */
        assertTrue(valeurs.contains("web_repertoire=CONCAT('C:',CHAR(92),'prestige',CHAR(92),'whatsapp-web')"),
                valeurs);
        assertTrue(condition.contains("mode = 'WEB'"), condition);
        /* installation deja configuree : rien n'est change */
        for (String garde : new String[] { "NULLIF(TRIM(web_url), '') IS NULL",
                "NULLIF(TRIM(web_repertoire), '') IS NULL", "NULLIF(TRIM(web_jeton), '') IS NULL", "updated_at IS NULL",
                "updated_by IS NULL" }) {
            assertTrue(condition.contains(garde), "garde « " + garde + " » : " + condition);
        }
        assertEquals(1, sql.split("UPDATE ", -1).length - 1, "une seule ecriture");
    }
}
