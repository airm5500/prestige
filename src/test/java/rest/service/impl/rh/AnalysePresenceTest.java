package rest.service.impl.rh;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.rh.AnalysePresence.Journee;
import rest.service.impl.rh.AnalysePresence.Pointage;
import rest.service.impl.rh.AnalysePresence.Prevu;

/** Plan d'octobre, section 3 : presence, retards, heures supplementaires et incoherences. */
public class AnalysePresenceTest {

    private static final LocalDate J = LocalDate.of(2026, 11, 2);
    private static final Prevu JOUR = new Prevu("TRAVAIL", LocalTime.of(8, 0), LocalTime.of(17, 0), 60);

    private static Pointage p(String hhmm, String sens) {
        return new Pointage(J.atTime(LocalTime.parse(hhmm)), sens);
    }

    private static Journee a(Prevu prevu, List<Pointage> pts) {
        return AnalysePresence.analyser(J, prevu, pts, null, 5, 12 * 60);
    }

    @Test
    public void journeeNormaleAvecRetardEtHeuresSup() {
        Journee j = a(JOUR,
                Arrays.asList(p("08:12", "ENTREE"), p("12:00", "SORTIE"), p("13:00", "ENTREE"), p("18:30", "SORTIE")));
        assertEquals(12, j.retard);
        assertEquals(0, j.departAnticipe);
        assertEquals(228 + 330, j.presence);
        assertEquals(480, j.prevu);
        assertEquals(78, j.heuresSup);
        assertTrue(j.anomalies.isEmpty(), j.anomalies.toString());
    }

    @Test
    public void toleranceEtDepartAnticipe() {
        Journee j = a(JOUR, Arrays.asList(p("08:04", "ENTREE"), p("16:30", "SORTIE")));
        assertEquals(0, j.retard, "4 min : dans la tolerance");
        assertEquals(30, j.departAnticipe);
    }

    @Test
    public void sensInconnuAlterneEtDoublon() {
        Journee j = a(JOUR, Arrays.asList(p("08:00", null), p("08:01", null), p("17:00", null)));
        assertTrue(j.anomalies.contains("DOUBLON"));
        assertEquals(540, j.presence);
        assertEquals("ENTREE", j.retenus.get(0).sens);
        assertEquals("SORTIE", j.retenus.get(1).sens);
    }

    @Test
    public void incoherences() {
        assertTrue(a(JOUR, Arrays.asList(p("08:00", "ENTREE"), p("09:00", "ENTREE"), p("17:00", "SORTIE"))).anomalies
                .contains("DEUX_ENTREES"));
        assertTrue(a(JOUR, Arrays.asList(p("17:00", "SORTIE"))).anomalies.contains("SORTIE_SANS_ENTREE"));
        Journee ouverte = a(JOUR, Arrays.asList(p("08:00", "ENTREE")));
        assertTrue(ouverte.anomalies.contains("ENTREE_SANS_SORTIE"));
        assertEquals(0, ouverte.presence);
        assertTrue(a(JOUR, Collections.emptyList()).absent());
        assertTrue(a(JOUR, Arrays.asList(p("06:00", "ENTREE"), p("20:00", "SORTIE"))).anomalies
                .contains("JOURNEE_LONGUE"));
        Journee repos = a(new Prevu("REPOS", null, null, 0), Arrays.asList(p("09:00", "ENTREE"), p("11:00", "SORTIE")));
        assertTrue(repos.anomalies.contains("HORS_PLANNING"));
        assertEquals(120, repos.heuresSup);
        Journee conge = AnalysePresence.analyser(J, JOUR, Arrays.asList(p("09:00", "ENTREE")), "CONGE", 5, 720);
        assertTrue(conge.anomalies.contains("POINTAGE_EN_CONGE"));
        assertTrue(!AnalysePresence.analyser(J, JOUR, Collections.emptyList(), "CONGE", 5, 720).absent(),
                "absence justifiee");
    }

    @Test
    public void gardeDeNuit() {
        Prevu garde = new Prevu("GARDE", LocalTime.of(20, 0), LocalTime.of(8, 0), 0);
        assertEquals(J, AnalysePresence.rattachement(J.plusDays(1).atTime(8, 10), garde));
        assertEquals(J.plusDays(1), AnalysePresence.rattachement(J.plusDays(1).atTime(13, 0), garde));
        assertEquals(J.plusDays(1), AnalysePresence.rattachement(J.plusDays(1).atTime(9, 0), JOUR));
        Journee j = AnalysePresence.analyser(J, garde, Arrays.asList(new Pointage(J.atTime(20, 0), "ENTREE"),
                new Pointage(LocalDateTime.of(J.plusDays(1), LocalTime.of(8, 0)), "SORTIE")), null, 5, 13 * 60);
        assertEquals(720, j.presence);
        assertEquals(0, j.departAnticipe);
        assertEquals(0, j.heuresSup);
        Journee longue = AnalysePresence.analyser(J, garde, Arrays.asList(new Pointage(J.atTime(20, 0), "ENTREE"),
                new Pointage(LocalDateTime.of(J.plusDays(1), LocalTime.of(8, 5)), "SORTIE")), null, 5, 12 * 60);
        assertTrue(longue.anomalies.isEmpty(), "garde de 12 h 05 prevue 12 h : pas anormale " + longue.anomalies);
    }
}
