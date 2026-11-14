package bll.facture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Facturation des tiers payants avec un « montant maximal par facture » (fiche du tiers payant).
 * <p>
 * Test de COHERENCE sur 20 000 facturations tirees au hasard (graine fixe) : 1 a 40 bons, montants de 0 a 3 fois le
 * plafond, bons egaux au plafond, premier ou dernier bon au-dessus du plafond, total sous le plafond. Regles : chaque
 * bon est facture une fois et une seule, dans l'ordre ; aucune facture vide ; somme des factures = somme des bons ; une
 * facture ne depasse pas le plafond, sauf si elle ne porte qu'un bon qui le depasse a lui seul ; une facture n'est
 * fermee que si le bon suivant la ferait depasser ; la variante « une seule facture » prend exactement la premiere
 * facture de la decoupe.
 * </p>
 */
class DecoupeMontantMaxCoherenceTest {

    private static String decrire(long[] m, long plafond, List<int[]> t) {
        StringBuilder s = new StringBuilder("plafond ").append(plafond).append(", bons ").append(Arrays.toString(m))
                .append(" -> ");
        for (int[] r : t) {
            s.append(Arrays.toString(Arrays.copyOfRange(m, r[0], Math.max(r[0], r[1])))).append(' ');
        }
        return s.toString();
    }

    static void verifier(long[] m, long plafond) {
        List<int[]> t = DecoupeMontantMax.decouper(m, plafond);
        String d = decrire(m, plafond, t);
        int attendu = 0;
        long totalFactures = 0;
        long totalBons = Arrays.stream(m).sum();
        for (int k = 0; k < t.size(); k++) {
            int[] r = t.get(k);
            assertEquals(attendu, r[0], "bon oublie ou facture deux fois : " + d);
            assertTrue(r[1] > r[0], "facture vide : " + d);
            long somme = 0;
            for (int i = r[0]; i < r[1]; i++) {
                somme += m[i];
            }
            assertTrue(somme <= plafond || r[1] - r[0] == 1, "facture au-dessus du plafond : " + d);
            if (k < t.size() - 1) {
                assertTrue(somme + m[r[1]] > plafond, "facture fermee trop tot : " + d);
            }
            totalFactures += somme;
            attendu = r[1];
        }
        assertEquals(m.length, attendu, "bons non factures : " + d);
        assertEquals(totalBons, totalFactures, "somme des factures differente de la somme des bons : " + d);
        if (m.length == 0) {
            assertEquals(0, t.size(), "aucun bon, aucune facture : " + d);
        } else if (totalBons <= plafond) {
            assertEquals(1, t.size(), "une seule facture sous le plafond : " + d);
        }
        assertEquals(t.isEmpty() ? 0 : t.get(0)[1], DecoupeMontantMax.premiereFacture(m, plafond),
                "premiere facture differente : " + d);
    }

    @Test
    @DisplayName("Cas types : premier bon au-dessus du plafond, dernier bon au-dessus, bons egaux au plafond")
    void casTypes() {
        verifier(new long[] { 15000, 3000, 4000 }, 10000);
        verifier(new long[] { 3000, 4000, 15000 }, 10000);
        verifier(new long[] { 4000, 4000, 4000, 4000 }, 10000);
        verifier(new long[] { 10000, 10000, 10000 }, 10000);
        verifier(new long[] { 6000, 6000 }, 10000);
        verifier(new long[] { 2000, 0, 9000, 0, 1000 }, 10000);
        verifier(new long[] { 9000 }, 10000);
        verifier(new long[] { 12000 }, 10000);
        verifier(new long[] {}, 10000);
    }

    @Test
    @DisplayName("20 000 facturations tirees au hasard")
    void hasard() {
        Random r = new Random(20261114L);
        for (int k = 0; k < 20000; k++) {
            long plafond = 1 + r.nextInt(50000);
            int n = 1 + r.nextInt(40);
            long[] m = new long[n];
            for (int i = 0; i < n; i++) {
                switch (r.nextInt(6)) {
                case 0:
                    m[i] = 0;
                    break;
                case 1:
                    m[i] = plafond;
                    break;
                case 2:
                    m[i] = plafond + 1 + r.nextInt((int) Math.min(Integer.MAX_VALUE - 1, 2 * plafond));
                    break;
                default:
                    m[i] = r.nextInt((int) plafond + 1);
                    break;
                }
            }
            verifier(m, plafond);
        }
    }
}
