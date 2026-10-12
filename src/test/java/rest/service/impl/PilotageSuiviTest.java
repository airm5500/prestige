package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Onglet A suivre : pas, rang du jour dans l'annee et evolution « a date » (retours du 12/10). */
class PilotageSuiviTest {

    @Test
    void rangEtTaille() {
        LocalDate j = LocalDate.of(2026, 10, 12);
        assertEquals(10, PilotageSuiviService.rang(j, "MOIS"));
        assertEquals(42, PilotageSuiviService.rang(j, "SEMAINE"));
        assertEquals(1, PilotageSuiviService.rang(j, "ANNEE"));
        assertEquals(53, PilotageSuiviService.taille("SEMAINE"));
        assertEquals(12, PilotageSuiviService.taille("MOIS"));
    }

    @Test
    void evolution() {
        assertEquals(10.0, PilotageSuiviService.evolution(1100, 1000), 0.001);
        assertEquals(-50.0, PilotageSuiviService.evolution(500, 1000), 0.001);
        assertEquals(0, PilotageSuiviService.evolution(500, 0), 0.001);
    }
}
