package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Retour du 31/10 : « Parcourir » choisit le dossier du service sur le serveur (sous-dossiers seulement). */
public class ParcoursDossiersTest {

    @TempDir
    Path tmp;

    @Test
    public void sousDossiersTriesEtServiceReconnu() throws Exception {
        Files.createDirectories(tmp.resolve("zeta"));
        Files.createDirectories(tmp.resolve("Alpha"));
        Path wa = Files.createDirectories(tmp.resolve("whatsapp-web").resolve("src"));
        Files.write(tmp.resolve("whatsapp-web").resolve("package.json"),
                "{\"name\":\"prestige-whatsapp-web\"}".getBytes(StandardCharsets.UTF_8));
        Files.write(wa.resolve("serveur.js"), new byte[0]);
        Files.write(tmp.resolve("fichier.txt"), new byte[0]);

        JSONArray l = LancementServiceWhatsApp.dossiers(tmp.toString());
        assertEquals(3, l.length(), "les fichiers ne sont pas listes : " + l);
        assertEquals("Alpha", l.getJSONObject(0).getString("text"));
        assertEquals("whatsapp-web", l.getJSONObject(1).getString("text"));
        assertEquals("zeta", l.getJSONObject(2).getString("text"));
        JSONObject service = l.getJSONObject(1);
        assertTrue(service.getBoolean("service"));
        assertEquals(new File(tmp.toFile(), "whatsapp-web").getAbsolutePath(), service.getString("id"));
        assertFalse(l.getJSONObject(0).getBoolean("service"));
    }

    @Test
    public void racinesEtCheminInconnu() {
        assertTrue(LancementServiceWhatsApp.dossiers("").length() > 0, "sans chemin : les lecteurs du serveur");
        assertEquals(0, LancementServiceWhatsApp.dossiers(tmp.resolve("absent").toString()).length());
    }
}
