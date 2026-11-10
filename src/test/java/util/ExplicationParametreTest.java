package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 10/11/2026 : explication depliable d'un parametre (bouton « i » de l'ecran des parametres). Le format est
 * controle, et l'explication livree par la migration du parametre KEY_PRISE_EN_CHARGE_TOTALE est relue ici : elle doit
 * etre lisible et ses cas chiffres doivent etre ceux que le moteur calcule (PriseEnChargeTotaleTest).
 */
class ExplicationParametreTest {

    @Test
    void uneExplicationSansRegleOuIllisibleNEstPasMontree() {
        assertFalse(ExplicationParametre.estValide(null));
        assertFalse(ExplicationParametre.estValide("  "));
        assertFalse(ExplicationParametre.estValide("pas du JSON"));
        assertFalse(ExplicationParametre.estValide("{\"regle\":\"\"}"));
        assertFalse(ExplicationParametre.estValide("{\"cas\":[[\"a\"]]}"));
        assertFalse(ExplicationParametre.estValide("{\"regle\":\"r\",\"cas\":\"texte\"}"));
        assertFalse(ExplicationParametre.estValide("{\"regle\":\"r\",\"rappels\":\"texte\"}"));
        // une ligne de cas plus courte que les entetes : tableau bancal, refuse
        assertFalse(ExplicationParametre.estValide("{\"regle\":\"r\",\"entetes\":[\"a\",\"b\"],\"cas\":[[\"1\"]]}"));
    }

    @Test
    void uneRegleSeuleSuffit() {
        assertTrue(ExplicationParametre.estValide("{\"regle\":\"A 1, la colonne est affichee.\"}"));
        assertTrue(ExplicationParametre
                .estValide("{\"regle\":\"r\",\"entetes\":[\"a\",\"b\"],\"cas\":[[\"1\",\"2\"]],\"rappels\":[\"x\"]}"));
    }

    @Test
    void lExplicationLivreeAvecLaPriseEnChargeTotaleEstLisibleEtPorteLesSixCas() throws Exception {
        String sql = new String(
                Files.readAllBytes(Paths.get("src/main/resources/db/migration/V7.6.20__prise_en_charge_totale.sql")),
                StandardCharsets.UTF_8);
        Matcher m = Pattern.compile("'(\\{\"regle\".*\\})'").matcher(sql);
        assertTrue(m.find(), "explication absente de la migration");
        String json = m.group(1).replace("''", "'");
        assertTrue(ExplicationParametre.estValide(json), json);
        JSONObject o = new JSONObject(json);
        assertEquals("Cas,RO,RC1,Client", o.getJSONArray("entetes").join(",").replace("\"", ""));
        JSONArray cas = o.getJSONArray("cas");
        // memes montants que PriseEnChargeTotaleTest : RO / RC1 / client
        String[] attendus = { "800/200/0", "800/200/0", "0/1 000/0", "200/800/0", "1 000/0/0", "0/600/400" };
        assertEquals(attendus.length, cas.length());
        for (int i = 0; i < attendus.length; i++) {
            JSONArray l = cas.getJSONArray(i);
            assertEquals(attendus[i], l.getString(1) + "/" + l.getString(2) + "/" + l.getString(3), l.getString(0));
        }
        assertEquals(3, o.getJSONArray("rappels").length());
    }
}
