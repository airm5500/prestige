package rest.service.impl;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

/** Retours des tests 3 : les trois series par jour, calculees separement, se fusionnent jour par jour et triees. */
public class FusionJoursTest {

    @Test
    public void fusionneLesSeriesJourParJourAvecLesValeursParDefaut() {
        Map<String, JSONObject> ca = new TreeMap<>();
        ca.put("2025-05-02", new JSONObject().put("montantNet", 35000L).put("ventes", 3L));
        ca.put("2025-06-01", new JSONObject().put("montantNet", 18000L).put("ventes", 2L));
        Map<String, JSONObject> credit = new HashMap<>();
        credit.put("2025-06-01", new JSONObject().put("montantTp", 7000L));
        credit.put("2025-04-30", new JSONObject().put("montantAchat", 1200L));
        Map<String, JSONObject> modes = new HashMap<>();
        modes.put("2025-05-02", new JSONObject().put("montantEsp", 11000L).put("montantMobile", 9000L));

        JSONArray jours = BalanceServiceImpl.fusionnerJours(Arrays.asList(ca, credit, null, modes));

        assertEquals(3, jours.length());
        JSONObject j0 = jours.getJSONObject(0);
        assertEquals("2025-04-30", j0.getString("jour"));
        assertEquals(1200L, j0.getLong("montantAchat"));
        assertEquals(0L, j0.getLong("montantNet"));
        assertEquals(0L, j0.getLong("montantEsp"));
        JSONObject j1 = jours.getJSONObject(1);
        assertEquals("2025-05-02", j1.getString("jour"));
        assertEquals(35000L, j1.getLong("montantNet"));
        assertEquals(3L, j1.getLong("ventes"));
        assertEquals(11000L, j1.getLong("montantEsp"));
        assertEquals(9000L, j1.getLong("montantMobile"));
        assertEquals(0L, j1.getLong("montantTp"));
        JSONObject j2 = jours.getJSONObject(2);
        assertEquals(18000L, j2.getLong("montantNet"));
        assertEquals(7000L, j2.getLong("montantTp"));
    }
}
