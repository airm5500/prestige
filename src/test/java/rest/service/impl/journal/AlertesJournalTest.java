package rest.service.impl.journal;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AlertesJournalTest {

    private static AlertesJournal.Ligne l(String quand, String user, String type) {
        return new AlertesJournal.Ligne(LocalDateTime.parse(quand), user, "Nom " + user, type, type, "desc", "POSTE-1");
    }

    @Test
    void annulationsEnSerie() {
        List<AlertesJournal.Ligne> j = new ArrayList<>();
        /* A : 4 annulations en 25 minutes -> une serie ; B : 3 annulations etalees sur 2 h -> rien */
        j.add(l("2026-10-10T10:00", "A", "ANNULATION_DE_VENTE"));
        j.add(l("2026-10-10T10:10", "A", "ANNULATION_DE_VENTE"));
        j.add(l("2026-10-10T10:20", "A", "ANNULATION_DE_VENTE"));
        j.add(l("2026-10-10T10:25", "A", "ANNULATION_DE_VENTE"));
        j.add(l("2026-10-10T15:00", "A", "ANNULATION_DE_VENTE")); // isolee
        j.add(l("2026-10-10T09:00", "B", "ANNULATION_DE_VENTE"));
        j.add(l("2026-10-10T10:00", "B", "ANNULATION_DE_VENTE"));
        j.add(l("2026-10-10T11:00", "B", "ANNULATION_DE_VENTE"));
        JSONArray s = new AlertesJournal(3, 30, null, null).analyser(j, 100).getJSONArray("annulationsEnSerie");
        assertEquals(1, s.length());
        assertEquals("Nom A", s.getJSONObject(0).getString("utilisateur"));
        assertEquals(4, s.getJSONObject(0).getInt("nombre"));
        assertEquals("10/10/2026 10:00", s.getJSONObject(0).getString("debut"));
        assertEquals("10/10/2026 10:25", s.getJSONObject(0).getString("fin"));
    }

    @Test
    void horsHorairesSansConnexions() {
        List<AlertesJournal.Ligne> j = new ArrayList<>();
        j.add(l("2026-10-10T06:30", "A", "AJUSTEMENT_DE_PRODUIT")); // avant 07:00
        j.add(l("2026-10-10T06:31", "A", "AUTHENTIFICATION")); // connexion : exclue
        j.add(l("2026-10-10T12:00", "A", "VENTE"));
        j.add(l("2026-10-10T22:15", "B", "VENTE")); // apres 21:00
        JSONObject o = new AlertesJournal(3, 30, LocalTime.of(7, 0), LocalTime.of(21, 0)).analyser(j, 1);
        assertEquals(2, o.getInt("nbHorsHoraires"));
        assertEquals(1, o.getJSONArray("horsHoraires").length()); // limite demandee
        assertEquals("10/10/2026 06:30", o.getJSONArray("horsHoraires").getJSONObject(0).getString("quand"));
    }

    @Test
    void applicationLueDansLAgent() {
        assertEquals("Chrome 120 · Windows", util.ContexteRequete.application(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"));
        assertEquals("Edge 119 · Windows", util.ContexteRequete.application(
                "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/119.0 Safari/537.36 Edg/119.0.2151.58"));
        assertEquals("Firefox 115 · Linux", util.ContexteRequete
                .application("Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0"));
        assertEquals("Application mobile", util.ContexteRequete.application("Dart/3.2 (dart:io)"));
        assertEquals(null, util.ContexteRequete.application(" "));
    }
}
