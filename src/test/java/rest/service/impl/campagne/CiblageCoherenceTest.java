package rest.service.impl.campagne;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Plan avoir du 08/11, points 4 et 5 : filtre « clients ayant acheté ». Cas types, puis 3 000 jeux tires au hasard
 * (graine fixe), chacun recalcule par une methode independante (comptage direct par client).
 */
class CiblageCoherenceTest {

    private static final LocalDate J = LocalDate.of(2026, 11, 8);

    @Test
    void casTypes() {
        List<Ciblage.Achat> l = Arrays.asList(new Ciblage.Achat("A", "v1", J.minusDays(60), 1000),
                new Ciblage.Achat("A", "v1", J.minusDays(60), 500), /* 2e ligne de la meme vente */
                new Ciblage.Achat("A", "v2", J.minusDays(30), 2000), new Ciblage.Achat("A", "v3", J, 0),
                new Ciblage.Achat("B", "v4", J.minusDays(5), 9000), new Ciblage.Achat("C", "v5", J, 100),
                new Ciblage.Achat("C", "v6", J, 100));
        Map<String, Ciblage.Resume> r = Ciblage.retenir(l, 3, null);
        assertEquals(1, r.size());
        assertEquals(3, r.get("A").achats, "deux lignes d'une vente = un achat");
        assertEquals(3500, r.get("A").montant);
        assertEquals(J, r.get("A").dernier);
        /* montant atteint : B seul ; minimum a 0 ou null = 1 achat */
        assertEquals(Arrays.asList("B"), new ArrayList<>(Ciblage.retenir(l, 0, 5000L).keySet()));
        assertEquals(3, Ciblage.retenir(l, null, null).size());
        /* montant exactement atteint : retenu */
        assertTrue(Ciblage.retenir(l, 2, 200L).containsKey("C"));
        assertFalse(Ciblage.retenir(l, 2, 201L).containsKey("C"));
        /* rien */
        assertTrue(Ciblage.retenir(new ArrayList<>(), 1, null).isEmpty());
    }

    @Test
    void reglesSurDesJeuxAuHasard() {
        Random r = new Random(20261108L);
        int retenusTotal = 0, vides = 0;
        for (int jeu = 0; jeu < 3000; jeu++) {
            int clients = 1 + r.nextInt(30);
            List<Ciblage.Achat> achats = new ArrayList<>();
            int ventes = r.nextInt(200);
            for (int v = 0; v < ventes; v++) {
                String c = "C" + r.nextInt(clients), vente = "V" + v;
                LocalDate jour = J.minusDays(r.nextInt(400));
                int lignes = 1 + r.nextInt(3);
                for (int k = 0; k < lignes; k++) {
                    /* montants varies : zero, petits, gros */
                    long m = r.nextInt(10) == 0 ? 0 : r.nextInt(5) == 0 ? 100000 + r.nextInt(500000) : r.nextInt(5000);
                    achats.add(new Ciblage.Achat(c, vente, jour, m));
                }
            }
            Integer min = r.nextInt(4) == 0 ? null : r.nextInt(6);
            Long montant = r.nextInt(3) == 0 ? null : (long) r.nextInt(300000);
            Map<String, Ciblage.Resume> res = Ciblage.retenir(achats, min, montant);

            /* methode independante */
            Map<String, Set<String>> ventesPar = new HashMap<>();
            Map<String, Long> montantPar = new HashMap<>();
            Map<String, LocalDate> dernierPar = new HashMap<>();
            for (Ciblage.Achat a : achats) {
                ventesPar.computeIfAbsent(a.clientId, k -> new HashSet<>()).add(a.venteId);
                montantPar.merge(a.clientId, a.montant, Long::sum);
                dernierPar.merge(a.clientId, a.jour, (x, y) -> x.isAfter(y) ? x : y);
            }
            int minEff = min == null || min < 1 ? 1 : min;
            long somme = 0;
            for (String c : ventesPar.keySet()) {
                boolean attendu = ventesPar.get(c).size() >= minEff
                        && (montant == null || montantPar.get(c) >= montant);
                assertEquals(attendu, res.containsKey(c), "jeu " + jeu + " client " + c);
                if (attendu) {
                    Ciblage.Resume x = res.get(c);
                    assertNotNull(x);
                    assertEquals(ventesPar.get(c).size(), x.achats);
                    assertEquals((long) montantPar.get(c), x.montant);
                    assertEquals(dernierPar.get(c), x.dernier);
                    assertTrue(x.montant >= 0 && x.achats >= 1 && x.achats >= minEff);
                    somme += x.montant;
                }
            }
            /* aucun client invente ; la somme des retenus ne depasse pas le total */
            assertTrue(ventesPar.keySet().containsAll(res.keySet()));
            assertTrue(somme <= montantPar.values().stream().mapToLong(Long::longValue).sum());
            retenusTotal += res.size();
            vides += res.isEmpty() ? 1 : 0;
        }
        assertTrue(retenusTotal > 5000 && vides > 100, retenusTotal + " retenus, " + vides + " jeux vides");
    }
}
