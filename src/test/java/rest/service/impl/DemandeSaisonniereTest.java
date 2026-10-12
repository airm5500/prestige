package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DemandeSaisonniereTest {

    @Test
    void fenetreSansLeMoisEnCours() {
        YearMonth[] f = DemandeSaisonniereService.fenetre(LocalDate.of(2026, 10, 12), 24);
        assertEquals(YearMonth.of(2024, 10), f[0]);
        assertEquals(YearMonth.of(2026, 9), f[1]);
    }

    @Test
    void indicesEtPic() {
        /* 24 mois : 10 unites par mois, 40 en decembre et 0 en juillet */
        Map<YearMonth, Long> u = new HashMap<>();
        YearMonth debut = YearMonth.of(2024, 10), fin = YearMonth.of(2026, 9);
        for (YearMonth m = debut; !m.isAfter(fin); m = m.plusMonths(1)) {
            u.put(m, m.getMonthValue() == 12 ? 40L : m.getMonthValue() == 7 ? 0L : 10L);
        }
        double[] i = DemandeSaisonniereService.indices(u, debut, fin);
        /* moyenne = (10 x 10 + 40 + 0) / 12 = 11,67 */
        assertEquals(3.43, i[11], 0.001);
        assertEquals(0, i[6], 0.001);
        assertEquals(0.86, i[0], 0.001);
        assertEquals(12, DemandeSaisonniereService.pic(i));
    }

    @Test
    void demandeReguliereSansForce() {
        Map<YearMonth, Long> u = new HashMap<>();
        YearMonth debut = YearMonth.of(2025, 10), fin = YearMonth.of(2026, 9);
        for (YearMonth m = debut; !m.isAfter(fin); m = m.plusMonths(1)) {
            u.put(m, 5L);
        }
        double[] i = DemandeSaisonniereService.indices(u, debut, fin);
        double[] un = new double[12];
        java.util.Arrays.fill(un, 1.0);
        assertArrayEquals(un, i, 0.001);
        assertEquals(0, DemandeSaisonniereService.force(i), 0.001);
    }

    @Test
    void rienDeVendu() {
        double[] i = DemandeSaisonniereService.indices(new HashMap<>(), YearMonth.of(2025, 10), YearMonth.of(2026, 9));
        assertArrayEquals(new double[12], i, 0.001);
    }
}
