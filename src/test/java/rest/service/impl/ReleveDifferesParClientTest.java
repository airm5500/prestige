package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 28/10 (point 16) : solde par client, et annulations retracees dans le releve des differes. */
class ReleveDifferesParClientTest {

    private static final LocalDateTime J = LocalDateTime.of(2026, 10, 10, 9, 0);

    @Test
    @DisplayName("Une vente annulee figure deux fois : debit puis credit « ANNULATION », solde inchange")
    void annulationRetracee() {
        List<ReleveDifferes.Operation> ops = Arrays.asList(
                new ReleveDifferes.Operation(J, "Vente différée (annulée ensuite)", "261010_00001", "KONAN A", 5000, 0,
                        "VENTE"),
                new ReleveDifferes.Operation(J.plusHours(2), "Annulation de la vente", "261010_00001", "KONAN A", 0,
                        5000, "ANNULATION"));
        JSONObject r = ReleveDifferes.releve(1000, ops);
        JSONArray l = r.getJSONArray("data");
        assertEquals("VENTE", l.getJSONObject(0).getString("type"));
        assertEquals(6000, l.getJSONObject(0).getLong("solde"));
        assertEquals("ANNULATION", l.getJSONObject(1).getString("type"));
        assertEquals(1000, l.getJSONObject(1).getLong("solde"));
        assertEquals(1000, r.getLong("soldeFinal"));
    }

    @Test
    @DisplayName("Ancien constructeur : type deduit du sens (VENTE / REGLEMENT), comme avant")
    void typeDeduit() {
        JSONObject r = ReleveDifferes.releve(0,
                Arrays.asList(new ReleveDifferes.Operation(J, "Vente différée", "R1", "A", 100, 0),
                        new ReleveDifferes.Operation(J.plusMinutes(1), "Règlement", "R2", "A", 0, 40)));
        assertEquals("VENTE", r.getJSONArray("data").getJSONObject(0).getString("type"));
        assertEquals("REGLEMENT", r.getJSONArray("data").getJSONObject(1).getString("type"));
    }

    @Test
    @DisplayName("Solde par client : debut + debits - credits de la periode, tries par nom, clients a zero omis")
    void soldesParClient() {
        Map<String, Long> debut = new HashMap<>();
        debut.put("YAO B", 2000L);
        debut.put("KONAN A", 1000L);
        debut.put("ZZZ VIDE", 0L);
        List<ReleveDifferes.Operation> ops = Arrays.asList(
                new ReleveDifferes.Operation(J, "Vente différée", "R1", "KONAN A", 5000, 0),
                new ReleveDifferes.Operation(J.plusHours(1), "Règlement", "R2", "KONAN A", 0, 3000),
                new ReleveDifferes.Operation(J.plusHours(2), "Vente différée", "R3", "ADJO C", 700, 0),
                new ReleveDifferes.Operation(J.plusHours(3), "Annulation de la vente", "R3", "ADJO C", 0, 700,
                        "ANNULATION"));
        JSONArray l = ReleveDifferes.soldesParClient(debut, ops);
        assertEquals(3, l.length());
        assertEquals("ADJO C", l.getJSONObject(0).getString("client"));
        assertEquals(0, l.getJSONObject(0).getLong("solde"));
        assertEquals("KONAN A", l.getJSONObject(1).getString("client"));
        assertEquals(1000, l.getJSONObject(1).getLong("soldeDebut"));
        assertEquals(5000, l.getJSONObject(1).getLong("debit"));
        assertEquals(3000, l.getJSONObject(1).getLong("credit"));
        assertEquals(3000, l.getJSONObject(1).getLong("solde"));
        assertEquals("YAO B", l.getJSONObject(2).getString("client"));
        assertEquals(2000, l.getJSONObject(2).getLong("solde"));
    }
}
