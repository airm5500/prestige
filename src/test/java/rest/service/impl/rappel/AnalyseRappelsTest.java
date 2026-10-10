package rest.service.impl.rappel;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AnalyseRappelsTest {

    @Test
    void statutsEnvoisEtEfficacite() {
        AnalyseRappels a = new AnalyseRappels();
        a.ajouter("2026-09", AnalyseRappels.A_PREPARER, false, null);
        a.ajouter("2026-09", AnalyseRappels.PREPARE, true, "SMS");
        a.ajouter("2026-09", AnalyseRappels.ACHETE, true, "WHATSAPP"); // rachete apres le rappel
        a.ajouter("2026-10", AnalyseRappels.ACHETE, false, null); // rachete sans rappel
        a.ajouter("2026-10", AnalyseRappels.ECARTE, true, null); // envoi ancien, canal non renseigne
        JSONObject t = a.json().getJSONObject("total");
        assertEquals(5, t.getInt("total"));
        assertEquals(1, t.getInt("aPreparer"));
        assertEquals(1, t.getInt("prepares"));
        assertEquals(1, t.getInt("ecartes"));
        assertEquals(2, t.getInt("rachetes"));
        assertEquals(3, t.getInt("envoyes"));
        assertEquals(1, t.getInt("rachetesApresEnvoi"));
        assertEquals(1, t.getInt("rachetesSansEnvoi"));
        assertEquals(33.3, t.getDouble("efficacite"), 1e-9);
        JSONObject c = t.getJSONObject("canaux");
        assertEquals(1, c.getInt("SMS"));
        assertEquals(1, c.getInt("WHATSAPP"));
        assertEquals(1, c.getInt(AnalyseRappels.CANAL_INCONNU));
    }

    @Test
    void parMoisDansLOrdre() {
        AnalyseRappels a = new AnalyseRappels();
        a.ajouter("2026-10", AnalyseRappels.PREPARE, false, null);
        a.ajouter("2026-08", AnalyseRappels.ACHETE, true, "SMS");
        JSONArray m = a.json().getJSONArray("mois");
        assertEquals("2026-08", m.getJSONObject(0).getString("mois"));
        assertEquals(100.0, m.getJSONObject(0).getDouble("efficacite"), 1e-9);
        assertEquals("2026-10", m.getJSONObject(1).getString("mois"));
        assertEquals(0.0, m.getJSONObject(1).getDouble("efficacite"), 1e-9);
    }
}
