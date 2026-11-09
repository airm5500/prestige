package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Periode de lecture (08/11) : sur des milliers de couples de dates tires avec une graine fixe, une periode est
 * acceptee si et seulement si du <= au et au plus un an d'ecart ; dates rendues telles quelles ; journal relisible.
 */
class PeriodeCoherenceTest {

    @Test
    void regleSurDesMilliersDeCas() {
        Random r = new Random(20261108L);
        LocalDate base = LocalDate.of(2024, 1, 1);
        int acceptees = 0, refusees = 0;
        for (int cas = 0; cas < 20000; cas++) {
            LocalDate du = base.plusDays(r.nextInt(1200)), au = du.plusDays(r.nextInt(900) - 200);
            long ecart = ChronoUnit.DAYS.between(du, au);
            boolean valide = ecart >= 0 && ecart < Periode.JOURS_MAX;
            if (valide) {
                Periode p = Periode.lire(" " + du + " ", au.toString());
                assertEquals(du, p.du);
                assertEquals(au, p.au);
                assertEquals("du=" + du + ";au=" + au, p.parametres());
                acceptees++;
            } else {
                assertThrows(IllegalArgumentException.class, () -> Periode.lire(du.toString(), au.toString()),
                        du + ".." + au);
                refusees++;
            }
        }
        assertEquals(20000, acceptees + refusees);
        org.junit.jupiter.api.Assertions.assertTrue(acceptees > 3000 && refusees > 3000, acceptees + " / " + refusees);
    }

    @Test
    void casLimites() {
        assertNull(Periode.lire(null, null));
        assertNull(Periode.lire("", "  "));
        for (String[] c : new String[][] { { "2026-11-08", "" }, { null, "2026-11-08" }, { "08/11/2026", "2026-11-08" },
                { "2026-11-08", "2026-13-01" }, { "2026-11-09", "2026-11-08" }, { "2025-11-08", "2026-11-09" } }) {
            assertThrows(IllegalArgumentException.class, () -> Periode.lire(c[0], c[1]), c[0] + ".." + c[1]);
        }
        assertEquals(LocalDate.of(2026, 11, 8), Periode.lire("2026-11-08", "2026-11-08").au);
        /* annee bissextile : 366 jours d'ecart refuses, 365 acceptes */
        assertEquals(365, ChronoUnit.DAYS.between(Periode.lire("2024-01-01", "2024-12-31").du,
                Periode.lire("2024-01-01", "2024-12-31").au));
        assertThrows(IllegalArgumentException.class, () -> Periode.lire("2024-01-01", "2025-01-01"));
    }
}
