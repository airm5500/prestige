package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 10 : par caissiere, taux de chaque operation sur les ventes encaissees de son type et taux
 * global. Regles verifiees sur des milliers de cas tires au hasard (graine fixe), une meme caissiere revenant dans
 * plusieurs branches de la requete (annulations, modifications, ventes) :
 * <ul>
 * <li>ventes comptant et credit = sommes des branches ;</li>
 * <li>taux annulations comptant = annulations / ventes comptant ; modifications comptant = modifications / ventes
 * comptant ; modifications credit = modifications / ventes credit ; global = (annulations + modifications) / (ventes
 * comptant + credit) ; arrondis au dixieme, jamais negatifs ;</li>
 * <li>sans vente du type : taux absent (null), jamais une division par zero ;</li>
 * <li>les anciennes lignes a 4 colonnes restent lues (ventes a 0, taux absents).</li>
 * </ul>
 */
class AnnulationsTauxCaissiereCoherenceTest {

    static double pct(long n, long sur) {
        return Math.round(100.0 * n / sur * 10) / 10.0;
    }

    @Test
    void milliersDeCaissieres() {
        Random r = new Random(9112026L);
        for (int essai = 0; essai < 3000; essai++) {
            List<Object[]> lignes = new ArrayList<>();
            Map<String, long[]> attendu = new HashMap<>();
            Map<String, String> noms = new HashMap<>();
            int n = r.nextInt(20);
            for (int i = 0; i < n; i++) {
                String id = "C" + r.nextInt(5);
                noms.put(id, "Caissiere " + id);
                long[] x = attendu.computeIfAbsent(id, k -> new long[5]);
                switch (r.nextInt(3)) {
                case 0:
                    long ac = r.nextInt(30);
                    lignes.add(new Object[] { id, ac, 0L, 0L, 0L, 0L });
                    x[0] += ac;
                    break;
                case 1:
                    long mc = r.nextInt(10), mk = r.nextInt(10);
                    lignes.add(new Object[] { id, 0L, mc, mk, 0L, 0L });
                    x[1] += mc;
                    x[2] += mk;
                    break;
                default:
                    /* parfois aucune vente d'un type : taux absent */
                    long vc = r.nextInt(4) == 0 ? 0 : r.nextInt(2000), vk = r.nextInt(4) == 0 ? 0 : r.nextInt(800);
                    lignes.add(new Object[] { id, 0L, 0L, 0L, vc, vk });
                    x[3] += vc;
                    x[4] += vk;
                }
            }
            List<Map<String, Object>> l = AnnulationsAuteurs.parCaissier(lignes, noms);
            assertEquals(attendu.values().stream().filter(x -> x[0] + x[1] + x[2] > 0).count(), l.size());
            for (Map<String, Object> m : l) {
                long[] x = attendu.get(m.get("id"));
                assertEquals(x[3], m.get("ventesComptant"));
                assertEquals(x[4], m.get("ventesCredit"));
                verifier(x[0], x[3], m.get("tauxAnnulationsComptant"));
                verifier(x[1], x[3], m.get("tauxModificationsComptant"));
                verifier(x[2], x[4], m.get("tauxModificationsCredit"));
                verifier(x[0] + x[1] + x[2], x[3] + x[4], m.get("taux"));
                assertEquals(x[0] + x[1] + x[2], m.get("total"));
            }
        }
    }

    static void verifier(long n, long sur, Object t) {
        if (sur == 0) {
            assertNull(t, "sans vente du type : pas de taux");
        } else {
            assertEquals(pct(n, sur), (Double) t, 1e-9);
            assertTrue((Double) t >= 0);
        }
    }

    @Test
    void anciennesLignesAQuatreColonnes() {
        List<Object[]> c = new ArrayList<>();
        c.add(new Object[] { "A", 3L, 1L, 2L });
        Map<String, Object> m = AnnulationsAuteurs.parCaissier(c, Map.of("A", "Alice")).get(0);
        assertEquals(0L, m.get("ventesComptant"));
        assertNull(m.get("taux"));
        assertEquals(6L, m.get("total"));
    }
}
