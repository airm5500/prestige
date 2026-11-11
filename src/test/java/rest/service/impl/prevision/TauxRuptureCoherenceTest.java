package rest.service.impl.prevision;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, points 5 et 6 : taux de rupture verifie par ses regles sur des milliers de catalogues tires au hasard
 * (graine fixe) : historiques de 0 a 36 mois, ventes nulles, faibles ou fortes, stocks rayon negatifs, nuls ou
 * positifs, reserve, parametres aux bornes (1 mois, N = 1, Q = 1, N superieur a la periode).
 */
class TauxRuptureCoherenceTest {

    @Test
    @SuppressWarnings("unchecked")
    void milliersDeCatalogues() {
        Random r = new Random(20261110L);
        for (int essai = 0; essai < 3000; essai++) {
            int mois = 1 + r.nextInt(12), moisVente = 1 + r.nextInt(14), q = 1 + r.nextInt(20);
            List<TauxRupture.Produit> produits = new ArrayList<>();
            int frequents = 0, ruptures = 0;
            int n = r.nextInt(80);
            for (int i = 0; i < n; i++) {
                int longueur = r.nextInt(37);
                StringBuilder h = new StringBuilder();
                int[] v = new int[longueur];
                for (int k = 0; k < longueur; k++) {
                    v[k] = r.nextInt(3) == 0 ? 0 : r.nextInt(r.nextBoolean() ? 3 : 40);
                    h.append(k == 0 ? "" : ",").append(v[k]);
                }
                int rayon = r.nextInt(4) == 0 ? -r.nextInt(5) : r.nextInt(3) == 0 ? 0 : r.nextInt(30);
                int reserve = r.nextInt(5) == 0 ? r.nextInt(10) : 0;
                produits.add(new TauxRupture.Produit("P" + i, "CIP" + i, "Produit " + i, h.toString(), rayon, reserve));
                /* reference independante */
                int vendus = 0, total = 0;
                for (int k = Math.max(0, longueur - mois); k < longueur; k++) {
                    vendus += v[k] > 0 ? 1 : 0;
                    total += v[k];
                }
                boolean frequent = vendus >= Math.min(moisVente, mois) && total >= q;
                if (frequent) {
                    frequents++;
                    if (Math.max(0, rayon) + reserve <= 0) {
                        ruptures++;
                    }
                }
            }
            Map<String, Object> m = TauxRupture.calculer(produits, mois, moisVente, q, 50);
            assertEquals(frequents, m.get("frequents"));
            assertEquals(ruptures, m.get("ruptures"));
            assertEquals(frequents == 0 ? 0.0 : Math.round(ruptures * 1000.0 / frequents) / 10.0, m.get("taux"),
                    "taux = ruptures / frequents");
            double t = (Double) m.get("taux");
            assertTrue(t >= 0 && t <= 100);
            List<Map<String, Object>> liste = (List<Map<String, Object>>) m.get("liste");
            List<String> ids = (List<String>) m.get("ids");
            assertEquals(ruptures, ids.size(), "tous les produits comptes sont identifies");
            assertEquals(Math.min(50, ruptures), liste.size());
            long precedent = Long.MAX_VALUE;
            for (Map<String, Object> l : liste) {
                assertTrue((Integer) l.get("rayon") <= 0 && (Integer) l.get("reserve") == 0, "stock nul");
                assertTrue((Long) l.get("vendus") >= q && (Integer) l.get("moisVendus") >= Math.min(moisVente, mois));
                assertTrue((Long) l.get("vendus") <= precedent, "du plus vendu au moins vendu");
                precedent = (Long) l.get("vendus");
            }
            /* plus exigeant = jamais plus de produits frequents */
            Map<String, Object> m2 = TauxRupture.calculer(produits, mois, moisVente, q + 1, 0);
            assertTrue((Integer) m2.get("frequents") <= frequents);
            assertTrue(((List<?>) m2.get("liste")).isEmpty());
        }
    }

    @Test
    void casLimites() {
        assertTrue(TauxRupture.frequent("0,0,5,1", 2, 2, 6));
        assertFalse(TauxRupture.frequent("0,0,5,1", 2, 2, 7));
        assertFalse(TauxRupture.frequent("9,9,0,1", 2, 2, 1), "mois hors periode ignores");
        assertFalse(TauxRupture.frequent("", 3, 1, 1));
        assertFalse(TauxRupture.frequent(null, 3, 1, 1));
        assertTrue(TauxRupture.frequent("x, 4", 1, 1, 4), "valeur illisible = 0");
        List<TauxRupture.Produit> p = new ArrayList<>();
        p.add(new TauxRupture.Produit("A", "1", "A", "3,3,3", 0, 0));
        p.add(new TauxRupture.Produit("B", "2", "B", "3,3,3", -2, 0));
        p.add(new TauxRupture.Produit("C", "3", "C", "3,3,3", 0, 4));
        p.add(new TauxRupture.Produit("D", "4", "D", "3,3,3", 5, 0));
        Map<String, Object> m = TauxRupture.calculer(p, 3, 2, 3, 10);
        assertEquals(4, m.get("frequents"));
        assertEquals(2, m.get("ruptures"), "rayon negatif ou nul sans reserve ; la reserve evite la rupture");
        assertEquals(50.0, m.get("taux"));
        assertEquals(0.0, TauxRupture.calculer(new ArrayList<>(), 3, 2, 3, 10).get("taux"));
    }
}
