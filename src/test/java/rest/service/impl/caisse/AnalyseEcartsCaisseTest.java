package rest.service.impl.caisse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AnalyseEcartsCaisseTest {

    private static LocalDateTime t(String s) {
        return LocalDateTime.parse(s);
    }

    /** AWA : 3 manquants sur 4 caisses, tous un vendredi soir ; BAMBA : un surplus ; une caisse sans billetage. */
    private static AnalyseEcartsCaisse exemple() {
        AnalyseEcartsCaisse a = new AnalyseEcartsCaisse(0);
        a.ajouter("C1", "AWA", t("2026-08-07T08:00"), t("2026-08-07T20:10"), 100_000, 98_000L); // vendredi, -2 000
        a.ajouter("C2", "AWA", t("2026-08-14T08:00"), t("2026-08-14T20:30"), 50_000, 45_000L); // vendredi, -5 000
        a.ajouter("C3", "AWA", t("2026-09-04T08:00"), t("2026-09-04T20:05"), 80_000, 79_500L); // vendredi, -500
        a.ajouter("C4", "AWA", t("2026-09-07T08:00"), t("2026-09-07T13:00"), 30_000, 30_000L); // juste
        a.ajouter("C5", "BAMBA", t("2026-09-08T08:00"), t("2026-09-08T13:00"), -20_000, 21_000L); // attendu en valeur
                                                                                                  // absolue : +1 000
        a.ajouter("C6", "BAMBA", t("2026-09-09T08:00"), null, 10_000, null); // sans billetage
        return a;
    }

    @Test
    void negatifEgaleManquant() {
        JSONObject t = exemple().json(10).getJSONObject("total");
        assertEquals(5, t.getInt("caisses"));
        assertEquals(1, t.getInt("sansBilletage"));
        assertEquals(1, t.getInt("justes"));
        assertEquals(3, t.getInt("manquants"));
        assertEquals(-7_500, t.getLong("montantManquant"));
        assertEquals(1, t.getInt("surplus"));
        assertEquals(1_000, t.getLong("montantSurplus"));
        assertEquals(-6_500, t.getLong("net"));
    }

    @Test
    void parCaissierEtPlusGros() {
        JSONObject j = exemple().json(2);
        JSONArray c = j.getJSONArray("caissiers");
        assertEquals("AWA", c.getJSONObject(0).getString("libelle")); // plus gros manquant en premier
        assertEquals(75.0, c.getJSONObject(0).getDouble("recurrence"), 1e-9);
        assertEquals(1_000, c.getJSONObject(1).getLong("net"));
        JSONArray g = j.getJSONArray("plusGros");
        assertEquals(2, g.length());
        assertEquals(-5_000, g.getJSONObject(0).getLong("ecart"));
        assertEquals(45_000, g.getJSONObject(0).getLong("billetage"));
        assertEquals(-2_000, g.getJSONObject(1).getLong("ecart"));
    }

    @Test
    void semainesMoisJoursHeures() {
        JSONObject j = exemple().json(10);
        assertEquals(2, j.getJSONArray("mois").length());
        assertEquals("2026-08", j.getJSONArray("mois").getJSONObject(0).getString("mois"));
        JSONArray s = j.getJSONArray("semaines");
        assertEquals("2026-S32", s.getJSONObject(0).getString("semaine"));
        assertEquals("03/08/2026", s.getJSONObject(0).getString("debut"));
        JSONArray jours = j.getJSONArray("jours");
        JSONObject vendredi = null;
        for (int i = 0; i < jours.length(); i++) {
            if (jours.getJSONObject(i).getInt("jour") == 5) {
                vendredi = jours.getJSONObject(i);
            }
        }
        assertEquals(3, vendredi.getInt("manquants"));
        assertEquals("vendredi", vendredi.getString("libelle"));
    }

    @Test
    void pistesEtTendance() {
        JSONObject j = exemple().json(10);
        String pistes = j.getJSONArray("pistes").toString();
        assertTrue(pistes.contains("Caissier aux manquants récurrents : AWA (3 sur 4"), pistes);
        assertTrue(pistes.contains("Jour à surveiller : vendredi (3 manquant(s) sur 3"), pistes);
        assertTrue(pistes.contains("Heure de fermeture à surveiller : 20 h - 21 h"), pistes);
        JSONObject t = j.getJSONObject("tendance");
        assertEquals("BAISSE", t.getString("sens")); // septembre -500 contre -7 000 en aout
    }

    @Test
    void toleranceRendLesPetitsEcartsJustes() {
        AnalyseEcartsCaisse a = new AnalyseEcartsCaisse(500);
        a.ajouter("C1", "AWA", t("2026-09-04T08:00"), t("2026-09-04T20:05"), 80_000, 79_500L);
        JSONObject t = a.json(10).getJSONObject("total");
        assertEquals(1, t.getInt("justes"));
        assertEquals(0, t.getInt("manquants"));
        assertEquals(0, a.json(10).getJSONArray("plusGros").length());
    }
}
