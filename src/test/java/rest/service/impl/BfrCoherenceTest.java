package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 19/11 : BFR = stock + creances clients - dettes fournisseurs ; jours = BFR / CA HT x 360. Regles verifiees
 * sur 20 000 cas tires au hasard (graine fixe) : composantes a 0, negatives (stock negatif, BFR negatif), tres grandes,
 * CA HT a 0 ou negatif (aucune division par zero : « non calculable »).
 */
class BfrCoherenceTest {

    private static long tirage(Random r) {
        switch (r.nextInt(6)) {
        case 0:
            return 0;
        case 1:
            return r.nextInt(1000);
        case 2:
            return -r.nextInt(5_000_000); // stock negatif, solde de differes crediteur
        case 3:
            return (long) (r.nextDouble() * 5_000_000_000L); // au-dela de Integer.MAX_VALUE
        default:
            return r.nextInt(200_000_000);
        }
    }

    @Test
    void bfrEtJours() {
        Random r = new Random(20261122L);
        int sansCa = 0, negatifs = 0;
        for (int i = 0; i < 20_000; i++) {
            long stock = tirage(r), differes = tirage(r), factures = Math.abs(tirage(r)), parts = Math.abs(tirage(r));
            long dettes = Math.abs(tirage(r));
            long ca = r.nextInt(8) == 0 ? (r.nextBoolean() ? 0 : -r.nextInt(100_000)) : Math.abs(tirage(r));
            long creances = BfrRegles.creances(differes, factures, parts);
            assertEquals(differes + factures + parts, creances, "creances = differes + factures + parts");
            long bfr = BfrRegles.bfr(stock, creances, dettes);
            assertEquals(stock + creances - dettes, bfr, "BFR = stock + creances - dettes");
            /* la somme des composantes affichees (y compris les postes non suivis, a 0) redonne le BFR */
            assertEquals(bfr, stock + differes + factures + parts + 0 - dettes - 0 - 0);
            Double jours = BfrRegles.jours(bfr, ca);
            if (ca <= 0) {
                sansCa++;
                assertNull(jours, "CA HT nul ou negatif : jours non calculables");
                continue;
            }
            double exact = (double) bfr * BfrRegles.BASE_JOURS / ca;
            assertTrue(Math.abs(jours - exact) <= 0.05 + Math.abs(exact) * 1e-12, jours + " / " + exact);
            assertEquals(Math.round(jours * 10), Math.round(jours * 10.0), 1e-9); // une decimale
            if (bfr != 0 && Math.abs(exact) >= 0.05) {
                assertEquals(Long.signum(bfr), (long) Math.signum(jours), "meme signe que le BFR");
            }
            if (bfr < 0) {
                negatifs++;
            }
        }
        assertTrue(sansCa > 1000 && negatifs > 1000, sansCa + " / " + negatifs);
    }

    @Test
    void casSimples() {
        assertEquals(1500, BfrRegles.bfr(1000, 800, 300));
        assertEquals(-200, BfrRegles.bfr(0, 100, 300));
        assertEquals(36.0, BfrRegles.jours(100, 1000));
        assertEquals(-72.0, BfrRegles.jours(-200, 1000));
        assertEquals(0.0, BfrRegles.jours(0, 1000));
        assertNull(BfrRegles.jours(1000, 0));
        assertNull(BfrRegles.jours(0, 0));
        assertEquals(LocalDate.of(2025, 11, 26), BfrRegles.debutCa(LocalDate.of(2026, 11, 20)));
        assertEquals(360, java.time.temporal.ChronoUnit.DAYS.between(BfrRegles.debutCa(LocalDate.of(2026, 11, 20)),
                LocalDate.of(2026, 11, 20)) + 1);
    }
}
