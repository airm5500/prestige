package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class ReleveDifferesTest {

    private static ReleveDifferes.Operation vente(String d, long m) {
        return new ReleveDifferes.Operation(LocalDateTime.parse(d), "Vente différée", "V1", "AWA", m, 0);
    }

    private static ReleveDifferes.Operation reglement(String d, long m) {
        return new ReleveDifferes.Operation(LocalDateTime.parse(d), "Règlement", "R1", "AWA", 0, m);
    }

    @Test
    void soldeCumuleEtTotalParMois() {
        JSONObject r = ReleveDifferes.releve(1000, List.of(reglement("2026-09-10T10:00", 300),
                vente("2026-09-02T09:00", 5000), vente("2026-10-01T08:00", 2000), reglement("2026-10-05T12:00", 4000)));
        JSONArray l = r.getJSONArray("data");
        /* sept : vente, reglement, total ; oct : vente, reglement, total */
        assertEquals(6, l.length());
        assertEquals(6000, l.getJSONObject(0).getLong("solde"));
        assertEquals(5700, l.getJSONObject(1).getLong("solde"));
        JSONObject sept = l.getJSONObject(2);
        assertEquals("MOIS", sept.getString("type"));
        assertEquals("Solde fin Septembre 2026", sept.getString("libelle"));
        assertEquals(5000, sept.getLong("debit"));
        assertEquals(300, sept.getLong("credit"));
        assertEquals(5700, sept.getLong("solde"));
        assertEquals(3700, l.getJSONObject(5).getLong("solde"));
        assertEquals(3700, r.getLong("soldeFinal"));
        assertEquals(7000, r.getLong("totalDebit"));
        assertEquals(4300, r.getLong("totalCredit"));
    }

    @Test
    void venteAvantSonReglementALaMemeMinuteEtPeriodeVide() {
        JSONArray l = ReleveDifferes
                .releve(0, List.of(reglement("2026-10-05T12:00", 500), vente("2026-10-05T12:00", 500)))
                .getJSONArray("data");
        assertEquals("VENTE", l.getJSONObject(0).getString("type"));
        assertEquals(500, l.getJSONObject(0).getLong("solde"));
        assertEquals(0, l.getJSONObject(1).getLong("solde"));
        JSONObject vide = ReleveDifferes.releve(250, List.of());
        assertEquals(0, vide.getJSONArray("data").length());
        assertEquals(250, vide.getLong("soldeFinal"));
    }
}
