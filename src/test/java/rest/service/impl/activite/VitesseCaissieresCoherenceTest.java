package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.Test;

import rest.service.dto.ActiviteAnalysesDTO;

/**
 * Plan du 08/11, point 15.3 : vitesse des caissieres, de la prise en caisse a l'encaissement. Regles verifiees sur des
 * milliers de jeux tires au hasard (graine fixe), nombres lus en BigDecimal / BigInteger / Long, prises inconnues
 * (null), durees negatives ou de plus d'une heure :
 * <ul>
 * <li>encaissees = nombre de preventes de la caissiere ; CA = somme des montants ; somme des encaissees = lignes ;</li>
 * <li>mesurees = durees connues de 0 a 1 h ; moyenne arrondie ; mediane exacte ; min <= mediane <= max ;</li>
 * <li>aucune mesure : temps a 0 ; tri par encaissees decroissantes puis nom ; nom absent remplace par « ? ».</li>
 * </ul>
 */
class VitesseCaissieresCoherenceTest {

    private static Object nombre(Random r, long v) {
        switch (r.nextInt(3)) {
        case 0:
            return BigDecimal.valueOf(v);
        case 1:
            return BigInteger.valueOf(v);
        default:
            return v;
        }
    }

    @Test
    void milliersDeJeux() {
        Random r = new Random(15301);
        for (int essai = 0; essai < 3000; essai++) {
            List<Object[]> lignes = new ArrayList<>();
            Map<String, String> noms = new HashMap<>();
            Map<String, long[]> cumul = new HashMap<>();
            Map<String, List<Long>> durees = new HashMap<>();
            int n = r.nextInt(60);
            for (int i = 0; i < n; i++) {
                String id = "C" + r.nextInt(5);
                if (r.nextInt(4) > 0) {
                    noms.put(id, "Caissiere " + id);
                }
                long prix = 100 + r.nextInt(50000);
                Long d = r.nextInt(4) == 0 ? null : (long) (r.nextInt(5000) - 200);
                lignes.add(new Object[] { id, nombre(r, prix), d == null ? null : nombre(r, d) });
                long[] x = cumul.computeIfAbsent(id, k -> new long[2]);
                x[0]++;
                x[1] += prix;
                List<Long> l = durees.computeIfAbsent(id, k -> new ArrayList<>());
                if (d != null && d >= 0 && d <= 3600) {
                    l.add(d);
                }
            }
            List<ActiviteAnalysesDTO.VitesseCaissiere> res = AgregatsActivite.vitesseCaissieres(lignes, noms);
            assertEquals(n, res.stream().mapToLong(ActiviteAnalysesDTO.VitesseCaissiere::getEncaissees).sum());
            assertEquals(cumul.size(), res.size());
            ActiviteAnalysesDTO.VitesseCaissiere avant = null;
            for (ActiviteAnalysesDTO.VitesseCaissiere c : res) {
                long[] x = cumul.get(c.getId());
                List<Long> d = durees.get(c.getId());
                d.sort(null);
                assertEquals(x[0], c.getEncaissees());
                assertEquals(x[1], c.getChiffreAffaires());
                assertEquals(d.size(), c.getMesurees());
                assertEquals(noms.getOrDefault(c.getId(), "?"), c.getNom());
                if (d.isEmpty()) {
                    assertEquals(0, c.getTempsMoyen());
                    assertEquals(0, c.getTempsMedian());
                } else {
                    assertEquals(Math.round(d.stream().mapToLong(Long::longValue).average().getAsDouble()),
                            c.getTempsMoyen());
                    int k = d.size();
                    long mediane = k % 2 == 1 ? d.get(k / 2) : Math.round((d.get(k / 2 - 1) + d.get(k / 2)) / 2.0);
                    assertEquals(mediane, c.getTempsMedian());
                    assertTrue(d.get(0) <= c.getTempsMedian() && c.getTempsMedian() <= d.get(k - 1));
                    assertTrue(c.getTempsMoyen() >= 0 && c.getTempsMoyen() <= 3600);
                }
                if (avant != null) {
                    assertTrue(avant.getEncaissees() > c.getEncaissees() || (avant.getEncaissees() == c.getEncaissees()
                            && avant.getNom().compareTo(c.getNom()) <= 0), "tri");
                }
                avant = c;
            }
        }
    }

    @Test
    void casLimites() {
        List<Object[]> l = new ArrayList<>();
        l.add(new Object[] { "A", 1000L, 30L });
        l.add(new Object[] { "A", 2000L, 90L });
        l.add(new Object[] { "A", 500L, -5L });
        l.add(new Object[] { "A", 700L, 3601L });
        l.add(new Object[] { "A", 300L, null });
        l.add(new Object[] { null, 900L, 10L });
        l.add(new Object[] { "B", 400L, 3600L });
        List<ActiviteAnalysesDTO.VitesseCaissiere> r = AgregatsActivite.vitesseCaissieres(l, Map.of("A", "Awa"));
        assertEquals(2, r.size());
        ActiviteAnalysesDTO.VitesseCaissiere a = r.get(0);
        assertEquals(5, a.getEncaissees());
        assertEquals(4500, a.getChiffreAffaires());
        assertEquals(2, a.getMesurees(), "negative, plus d'une heure et inconnue ecartees");
        assertEquals(60, a.getTempsMoyen());
        assertEquals(60, a.getTempsMedian());
        assertEquals(3600, r.get(1).getTempsMoyen(), "une heure pile retenue");
        assertEquals("?", r.get(1).getNom());
    }
}
