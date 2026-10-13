package rest.service.impl.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AuditRapportsTest {

    private static JSONObject section(String code, int nb, JSONObject... lignes) {
        return new JSONObject().put("code", code).put("titre", code).put("nb", nb).put("lignes", new JSONArray(lignes));
    }

    private static JSONObject rapport(JSONObject... sections) {
        return new JSONObject().put("sections", new JSONArray(sections));
    }

    private static JSONObject stock(String id, String empl, int ecart) {
        return new JSONObject().put("produitId", id).put("cip", "C" + id).put("libelle", "P" + id)
                .put("emplacement", empl).put("ecart", ecart);
    }

    private static JSONObject trouver(JSONObject comparaison, String code) {
        JSONArray s = comparaison.getJSONArray("sections");
        for (int i = 0; i < s.length(); i++) {
            if (code.equals(s.getJSONObject(i).getString("code"))) {
                return s.getJSONObject(i);
            }
        }
        return null;
    }

    @Test
    void apparusDisparusPersistants() {
        JSONObject a = rapport(section("STOCK", 2, stock("1", "OFFICINE", 3), stock("2", "OFFICINE", 1)));
        JSONObject b = rapport(section("STOCK", 2, stock("2", "OFFICINE", 1), stock("3", "GOKRA", -2)));
        JSONObject s = trouver(AuditRapports.comparer(a, b), "STOCK");
        assertEquals(2, s.getInt("nbA"));
        assertEquals(2, s.getInt("nbB"));
        assertEquals(1, s.getInt("persistants"));
        assertEquals("C3 P3 (GOKRA) : écart -2", s.getJSONArray("apparus").getString(0));
        assertEquals("C1 P1 (OFFICINE) : écart 3", s.getJSONArray("disparus").getString(0));
        assertTrue(s.getBoolean("complet"));
    }

    @Test
    void memeProduitDansDeuxEmplacementsDeuxEcarts() {
        JSONObject a = rapport(section("STOCK", 1, stock("1", "OFFICINE", 3)));
        JSONObject b = rapport(section("STOCK", 2, stock("1", "OFFICINE", 3), stock("1", "GOKRA", 2)));
        JSONObject s = trouver(AuditRapports.comparer(a, b), "STOCK");
        assertEquals(1, s.getJSONArray("apparus").length());
        assertEquals(1, s.getInt("persistants"));
    }

    @Test
    void controleSansCasNEstPasUnEcart() {
        JSONObject a = rapport(
                section("CONTROLES", 1, new JSONObject().put("code", "X").put("libelle", "Lx").put("cas", 4),
                        new JSONObject().put("code", "Y").put("libelle", "Ly").put("cas", 0)));
        JSONObject b = rapport(
                section("CONTROLES", 0, new JSONObject().put("code", "X").put("libelle", "Lx").put("cas", 0),
                        new JSONObject().put("code", "Y").put("libelle", "Ly").put("cas", 0)));
        JSONObject s = trouver(AuditRapports.comparer(a, b), "CONTROLES");
        assertEquals(0, s.getJSONArray("apparus").length());
        assertEquals("Lx : 4 cas", s.getJSONArray("disparus").getString(0));
    }

    @Test
    void sectionTronqueeSignalee() {
        JSONObject a = rapport(section("STOCK", 900, stock("1", "OFFICINE", 3)));
        JSONObject b = rapport(section("STOCK", 1, stock("1", "OFFICINE", 3)));
        assertFalse(trouver(AuditRapports.comparer(a, b), "STOCK").getBoolean("complet"));
    }

    @Test
    void resumeParSection() {
        JSONObject r = AuditRapports.resume(rapport(section("STOCK", 5), section("CARNETS", 0)));
        assertEquals(5, r.getInt("STOCK"));
        assertEquals(0, r.getInt("CARNETS"));
    }
}
