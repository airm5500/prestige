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

/**
 * Plan du 08/11, point 15.1 : annulations rattachees a l'auteur de la vente et suivi des caissieres. Regles verifiees
 * sur des milliers de jeux tires au hasard (graine fixe), nombres lus en BigDecimal / BigInteger / Long :
 * <ul>
 * <li>par vendeur : taux = annulees / ventes en %, entre 0 et 100 ; annulees jamais superieures aux ventes ; vendeur
 * sans vente ecarte ; somme des ventes et des annulees conservee ; tri annulees, taux, nom ;</li>
 * <li>par caissiere : lignes d'une meme caissiere cumulees (les deux branches de l'UNION) ; total = somme des trois
 * compteurs ; caissiere sans operation ecartee ; somme conservee ; tri total, nom ; jamais negatif.</li>
 * </ul>
 */
class AnnulationsAuteursCoherenceTest {

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
    void milliersDeVendeurs() {
        Random r = new Random(15101);
        for (int essai = 0; essai < 3000; essai++) {
            List<Object[]> lignes = new ArrayList<>();
            Map<String, String> noms = new HashMap<>();
            long ventesAttendues = 0, annuleesAttendues = 0;
            int n = r.nextInt(14);
            for (int i = 0; i < n; i++) {
                String id = "V" + i;
                if (r.nextInt(6) > 0) {
                    noms.put(id, "Vendeur " + (char) ('A' + r.nextInt(26)));
                }
                long ventes = r.nextInt(4) == 0 ? 0 : 1 + r.nextInt(2000);
                long ann = ventes == 0 ? 0 : (r.nextInt(3) == 0 ? 0 : r.nextInt((int) Math.min(ventes, 60) + 1));
                lignes.add(new Object[] { id, nombre(r, ventes), nombre(r, ann) });
                ventesAttendues += ventes;
                annuleesAttendues += ann;
            }
            List<Map<String, Object>> l = AnnulationsAuteurs.parVendeur(lignes, noms);
            assertEquals(ventesAttendues, l.stream().mapToLong(m -> (Long) m.get("ventes")).sum());
            assertEquals(annuleesAttendues, l.stream().mapToLong(m -> (Long) m.get("annulees")).sum());
            Map<String, Object> avant = null;
            for (Map<String, Object> m : l) {
                long v = (Long) m.get("ventes"), a = (Long) m.get("annulees");
                double t = (Double) m.get("taux");
                assertTrue(v > 0, "vendeur sans vente ecarte");
                assertTrue(a >= 0 && a <= v);
                assertEquals(Math.round(1000.0 * a / v) / 10.0, t);
                assertTrue(t >= 0 && t <= 100);
                assertEquals(noms.getOrDefault(m.get("id"), "?"), m.get("nom"));
                if (avant != null) {
                    long aa = (Long) avant.get("annulees");
                    double ta = (Double) avant.get("taux");
                    assertTrue(
                            aa > a || (aa == a && (ta > t
                                    || (ta == t && ((String) avant.get("nom")).compareTo((String) m.get("nom")) <= 0))),
                            "tri");
                }
                avant = m;
            }
        }
    }

    @Test
    void milliersDeCaissieres() {
        Random r = new Random(15102);
        for (int essai = 0; essai < 3000; essai++) {
            List<Object[]> lignes = new ArrayList<>();
            Map<String, String> noms = new HashMap<>();
            Map<String, long[]> attendu = new HashMap<>();
            int n = r.nextInt(16);
            for (int i = 0; i < n; i++) {
                /* une meme caissiere peut revenir : branche annulations puis branche modifications */
                String id = "C" + r.nextInt(6);
                noms.putIfAbsent(id, "Caissiere " + id);
                long ac = r.nextInt(3) == 0 ? 0 : r.nextInt(40), mc = r.nextInt(2) == 0 ? 0 : r.nextInt(15),
                        mk = r.nextInt(2) == 0 ? 0 : r.nextInt(15);
                lignes.add(new Object[] { id, nombre(r, ac), nombre(r, mc), nombre(r, mk) });
                long[] x = attendu.computeIfAbsent(id, k -> new long[3]);
                x[0] += ac;
                x[1] += mc;
                x[2] += mk;
            }
            List<Map<String, Object>> l = AnnulationsAuteurs.parCaissier(lignes, noms);
            long attendues = attendu.values().stream().filter(x -> x[0] + x[1] + x[2] > 0).count();
            assertEquals(attendues, l.size(), "une ligne par caissiere ayant au moins une operation");
            Map<String, Object> avant = null;
            for (Map<String, Object> m : l) {
                long[] x = attendu.get(m.get("id"));
                assertEquals(x[0], m.get("annulationsComptant"));
                assertEquals(x[1], m.get("modificationsComptant"));
                assertEquals(x[2], m.get("modificationsCredit"));
                assertEquals(x[0] + x[1] + x[2], m.get("total"));
                assertTrue((Long) m.get("total") > 0);
                if (avant != null) {
                    long ta = (Long) avant.get("total"), t = (Long) m.get("total");
                    assertTrue(ta > t || (ta == t && ((String) avant.get("nom")).compareTo((String) m.get("nom")) <= 0),
                            "tri");
                }
                avant = m;
            }
        }
    }

    @Test
    void casLimites() {
        Map<String, String> noms = Map.of("A", "Awa");
        List<Object[]> v = new ArrayList<>();
        v.add(new Object[] { "A", 0L, 0L });
        v.add(new Object[] { null, 5L, 1L });
        v.add(new Object[] { "B", 3L, 9L });
        v.add(new Object[] { "C", 4L, -2L });
        v.add(new Object[] { "D", null, null });
        List<Map<String, Object>> l = AnnulationsAuteurs.parVendeur(v, noms);
        assertEquals(2, l.size());
        assertEquals("B", l.get(0).get("id"));
        assertEquals(3L, l.get(0).get("annulees"), "annulees bornees aux ventes");
        assertEquals(100.0, l.get(0).get("taux"));
        assertEquals("?", l.get(0).get("nom"));
        assertEquals(0L, l.get(1).get("annulees"), "jamais negatif");

        List<Object[]> c = new ArrayList<>();
        c.add(new Object[] { "A", 0L, 0L, 0L });
        c.add(new Object[] { null, 4L, 0L, 0L });
        c.add(new Object[] { "B", -3L, 2L, null });
        assertEquals(1, AnnulationsAuteurs.parCaissier(c, noms).size());
        assertEquals(2L, AnnulationsAuteurs.parCaissier(c, noms).get(0).get("total"));
    }
}
