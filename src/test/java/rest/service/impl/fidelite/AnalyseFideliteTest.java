package rest.service.impl.fidelite;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AnalyseFideliteTest {

    private static AnalyseFidelite exemple() {
        AnalyseFidelite a = new AnalyseFidelite();
        a.ajouter("2026-08", "A", "GAIN", 120, 0);
        a.ajouter("2026-08", "A", "ANNULATION", -20, 0); // vente annulee
        a.ajouter("2026-09", "A", "UTILISATION", -50, 250); // 50 points = 250 FCFA
        a.ajouter("2026-09", "B", "GAIN", 40, 0);
        a.ajouter("2026-09", "B", "UTILISATION", -10, 50);
        a.ajouter("2026-09", "B", "RESTITUTION", 10, 50); // paiement en points annule
        a.ajouter("2026-10", "C", "EXPIRATION", -30, 0);
        a.ajouter("2026-10", "C", "AJUSTEMENT", 5, 0);
        a.decrire("A", "AWA KONE", 50, "Argent");
        a.decrire("B", "BAMBA ALI", 40, "Standard");
        a.decrire("C", "COULIBALY", 5, "");
        return a;
    }

    @Test
    void totauxTauxEtCout() {
        JSONObject t = exemple().json(10, Arrays.asList("Standard", "Argent", "Or")).getJSONObject("total");
        assertEquals(140, t.getLong("gagnes")); // 120 + 40 - 20
        assertEquals(20, t.getLong("annules"));
        assertEquals(50, t.getLong("utilises")); // 50 + 10 - 10
        assertEquals(30, t.getLong("expires"));
        assertEquals(5, t.getLong("ajustements"));
        assertEquals(250, t.getLong("cout"));
        assertEquals(35.7, t.getDouble("tauxUtilisation"), 1e-9);
        assertEquals(3, t.getInt("clientsActifs"));
    }

    @Test
    void parMoisEtParPalier() {
        JSONObject j = exemple().json(10, Arrays.asList("Standard", "Argent", "Or"));
        JSONArray m = j.getJSONArray("mois");
        assertEquals(3, m.length());
        assertEquals("2026-08", m.getJSONObject(0).getString("mois"));
        assertEquals(100, m.getJSONObject(0).getLong("gagnes"));
        assertEquals(50, m.getJSONObject(1).getLong("utilises"));
        JSONArray p = j.getJSONArray("paliers");
        assertEquals("Standard", p.getJSONObject(0).getString("palier"));
        assertEquals(1, p.getJSONObject(0).getInt("clients"));
        assertEquals("Or", p.getJSONObject(2).getString("palier"));
        assertEquals(0, p.getJSONObject(2).getInt("clients"));
        assertEquals("Sans palier", p.getJSONObject(3).getString("palier"));
        assertEquals(33.3, p.getJSONObject(3).getDouble("part"), 1e-9);
    }

    @Test
    void meilleursClientsParPointsGagnes() {
        JSONArray b = exemple().json(2, Arrays.asList("Standard")).getJSONArray("meilleurs");
        assertEquals(2, b.length());
        assertEquals("AWA KONE", b.getJSONObject(0).getString("nom"));
        assertEquals(100, b.getJSONObject(0).getLong("gagnes"));
        assertEquals(50, b.getJSONObject(0).getLong("solde"));
        assertEquals("BAMBA ALI", b.getJSONObject(1).getString("nom"));
    }
}
