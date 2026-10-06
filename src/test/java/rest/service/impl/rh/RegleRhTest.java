package rest.service.impl.rh;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

/** Plan d'octobre, section 3 : planning de la semaine et absences. */
public class RegleRhTest {

    @Test
    public void heuresLisibles() {
        assertEquals(LocalTime.of(8, 0), RegleRh.heure("8:00"));
        assertEquals(LocalTime.of(8, 30), RegleRh.heure("08h30"));
        assertEquals(LocalTime.of(8, 30), RegleRh.heure("0830"));
        assertEquals(LocalTime.of(17, 0), RegleRh.heure("17h"));
        assertEquals(LocalTime.of(7, 0), RegleRh.heure("7"));
        assertNull(RegleRh.heure("25:00"));
        assertNull(RegleRh.heure("abc"));
        assertNull(RegleRh.heure(""));
    }

    @Test
    public void minutesDeTravail() {
        assertEquals(480, RegleRh.minutes(LocalTime.of(8, 0), LocalTime.of(17, 0), 60));
        assertEquals(720, RegleRh.minutes(LocalTime.of(20, 0), LocalTime.of(8, 0), 0), "garde de nuit");
        assertEquals(0, RegleRh.minutes(null, LocalTime.of(8, 0), 0));
    }

    @Test
    public void controlePlanning() {
        assertNull(RegleRh.controlerPlanning("TRAVAIL", "08:00", "17:00", 60));
        assertNull(RegleRh.controlerPlanning("REPOS", null, null, 0));
        assertNull(RegleRh.controlerPlanning("GARDE", "20:00", "08:00", 0));
        assertTrue(RegleRh.controlerPlanning("TRAVAIL", "", "17:00", 0).contains("obligatoires"));
        assertTrue(RegleRh.controlerPlanning("TRAVAIL", "08:00", "09:00", 60).contains("pause"));
        assertTrue(RegleRh.controlerPlanning("X", "08:00", "09:00", 0).contains("Type"));
        assertTrue(RegleRh.controlerPlanning("TRAVAIL", "08:00", "08:00", 0).contains("identiques"));
    }

    @Test
    public void absences() {
        LocalDate d = LocalDate.of(2026, 10, 12);
        assertNull(RegleRh.controlerAbsence("CONGE", d, d.plusDays(4), null));
        assertTrue(RegleRh.controlerAbsence("CONGE", d, d.minusDays(1), null).contains("avant"));
        assertTrue(RegleRh.controlerAbsence("CONGE", d, d.plusDays(1), "MATIN").contains("seul jour"));
        assertNull(RegleRh.controlerAbsence("MALADIE", d, d, "APRES_MIDI"));
        assertEquals(5.0, RegleRh.jours(d, d.plusDays(4), null));
        assertEquals(0.5, RegleRh.jours(d, d, "MATIN"));
        assertTrue(RegleRh.chevauche(d, d.plusDays(4), d.plusDays(4), d.plusDays(6)));
        assertFalse(RegleRh.chevauche(d, d.plusDays(4), d.plusDays(5), d.plusDays(6)));
        assertEquals(LocalDate.of(2026, 10, 5), RegleRh.lundi(LocalDate.of(2026, 10, 11)));
    }
}
