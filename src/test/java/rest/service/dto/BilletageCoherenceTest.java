package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigInteger;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Gestion de caisse G1 : le total d'un billetage est la somme de ses coupures (regle de test du 05/11). Des milliers de
 * billetages tires au hasard (graine fixe), comptes autrement (BigInteger) : le total est exact et jamais negatif ; un
 * billetage trop grand pour etre enregistre est refuse au lieu de donner un total faux.
 */
class BilletageCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int BILLETAGES = 20000;

    private static BilletageDTO billetage(Random r, int maxBillets, int maxAutre) {
        BilletageDTO b = new BilletageDTO();
        b.setDixMille(r.nextInt(maxBillets + 1));
        b.setCinqMille(r.nextInt(maxBillets + 1));
        b.setDeuxMille(r.nextInt(maxBillets + 1));
        b.setMille(r.nextInt(maxBillets + 1));
        b.setCinqCent(r.nextInt(maxBillets + 1));
        // une fois sur cinq, aucune piece
        b.setAutre(r.nextInt(5) == 0 ? 0 : r.nextInt(maxAutre + 1));
        return b;
    }

    private static BigInteger attendu(BilletageDTO b) {
        return BigInteger.valueOf(b.getDixMille()).multiply(BigInteger.valueOf(10000))
                .add(BigInteger.valueOf(b.getCinqMille()).multiply(BigInteger.valueOf(5000)))
                .add(BigInteger.valueOf(b.getDeuxMille()).multiply(BigInteger.valueOf(2000)))
                .add(BigInteger.valueOf(b.getMille()).multiply(BigInteger.valueOf(1000)))
                .add(BigInteger.valueOf(b.getCinqCent()).multiply(BigInteger.valueOf(500)))
                .add(BigInteger.valueOf(b.getAutre()));
    }

    @Test
    void totalEgalLaSommeDesCoupures() {
        Random r = new Random(GRAINE);
        for (int k = 0; k < BILLETAGES; k++) {
            BilletageDTO b = billetage(r, 2000, 200000);
            assertEquals(attendu(b).intValueExact(), b.getTotal(), b.toString());
            assertTrue(b.getTotal() >= 0, b.toString());
        }
    }

    @Test
    void caisseVideTotalNul() {
        assertEquals(0, new BilletageDTO().getTotal());
    }

    /** Faute de frappe (zeros en trop) : le total exact ou un refus, jamais un total faux ou negatif. */
    @Test
    void billetageTropGrandRefuseJamaisFaux() {
        Random r = new Random(GRAINE + 1);
        int refus = 0;
        for (int k = 0; k < BILLETAGES; k++) {
            BilletageDTO b = billetage(r, 1_000_000, Integer.MAX_VALUE - 1);
            BigInteger a = attendu(b);
            if (a.bitLength() < 32) {
                assertEquals(a.intValue(), b.getTotal(), b.toString());
            } else {
                refus++;
                assertThrows(ArithmeticException.class, b::getTotal, "total " + a + " : " + b);
            }
        }
        assertTrue(refus > 0, "le jeu d'essai doit contenir des billetages trop grands");
    }
}
