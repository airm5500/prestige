package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
 * Plan du 08/11, point 15.4 : classement des vendeurs en preventes. Regles verifiees sur des milliers de lignes tirees
 * au hasard (graine fixe), avec des zeros, des vendeurs sans prevente, des nombres lus en BigDecimal / BigInteger /
 * Long comme les renvoie le pilote :
 * <ul>
 * <li>total = encaissees + annulees + abandonnees ; taux = (annulees + abandonnees) / total en % ; lignes par prevente
 * = lignes / encaissees ;</li>
 * <li>vendeur sans prevente ecarte ; somme des totaux = somme des entrees ;</li>
 * <li>tri : encaissees decroissantes, puis CA, puis nom ;</li>
 * <li>taux entre 0 et 100, jamais negatif ; nom absent remplace par « ? ».</li>
 * </ul>
 */
class PreventesCoherenceTest {

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
    void milliersDeClassements() {
        Random r = new Random(15408);
        for (int essai = 0; essai < 2000; essai++) {
            List<Object[]> lignes = new ArrayList<>();
            Map<String, String> noms = new HashMap<>();
            long totalAttendu = 0, encAttendu = 0, caAttendu = 0;
            int n = r.nextInt(12);
            for (int i = 0; i < n; i++) {
                String id = "V" + i;
                if (r.nextInt(5) > 0) {
                    noms.put(id, "Vendeur " + (char) ('A' + r.nextInt(26)));
                }
                long enc = r.nextInt(4) == 0 ? 0 : r.nextInt(900), ca = enc * (1000 + r.nextInt(20000));
                long li = enc == 0 ? 0 : enc + r.nextInt((int) enc * 3 + 1),
                        ann = r.nextInt(3) == 0 ? 0 : r.nextInt(20), aba = r.nextInt(3) == 0 ? 0 : r.nextInt(10);
                lignes.add(new Object[] { id, nombre(r, enc), nombre(r, ca), nombre(r, li), nombre(r, ann),
                        nombre(r, aba) });
                totalAttendu += enc + ann + aba;
                encAttendu += enc;
                caAttendu += ca;
            }
            List<ActiviteAnalysesDTO.Prevente> l = AgregatsActivite.preventes(lignes, noms);
            assertEquals(totalAttendu, l.stream().mapToLong(ActiviteAnalysesDTO.Prevente::getTotal).sum());
            assertEquals(encAttendu, l.stream().mapToLong(ActiviteAnalysesDTO.Prevente::getEncaissees).sum());
            assertEquals(caAttendu, l.stream().mapToLong(ActiviteAnalysesDTO.Prevente::getChiffreAffaires).sum());
            ActiviteAnalysesDTO.Prevente avant = null;
            for (ActiviteAnalysesDTO.Prevente p : l) {
                assertTrue(p.getTotal() > 0, "vendeur sans prevente ecarte");
                assertEquals(p.getEncaissees() + p.getAnnulees() + p.getAbandonnees(), p.getTotal());
                assertEquals(Math.round(1000.0 * (p.getAnnulees() + p.getAbandonnees()) / p.getTotal()) / 10.0,
                        p.getTaux());
                assertEquals(p.getEncaissees() == 0 ? 0 : Math.round(10.0 * p.getLignes() / p.getEncaissees()) / 10.0,
                        p.getLignesParPrevente());
                assertTrue(p.getTaux() >= 0 && p.getTaux() <= 100);
                assertEquals(noms.getOrDefault(p.getId(), "?"), p.getNom());
                if (avant != null) {
                    assertTrue(avant.getEncaissees() > p.getEncaissees() || (avant.getEncaissees() == p.getEncaissees()
                            && (avant.getChiffreAffaires() > p.getChiffreAffaires()
                                    || (avant.getChiffreAffaires() == p.getChiffreAffaires()
                                            && avant.getNom().compareTo(p.getNom()) <= 0))),
                            "tri");
                }
                avant = p;
            }
        }
    }

    @Test
    void casLimites() {
        Map<String, String> noms = Map.of("A", "Awa", "B", "Bakary");
        List<Object[]> l = new ArrayList<>();
        l.add(new Object[] { "A", 0L, 0L, 0L, 0L, 0L });
        l.add(new Object[] { "B", 0L, 0L, 0L, 0L, 3L });
        l.add(new Object[] { null, 5L, 100L, 5L, 0L, 0L });
        l.add(new Object[] { "C", -2L, null, 0L, 1L, 0L });
        List<ActiviteAnalysesDTO.Prevente> r = AgregatsActivite.preventes(l, noms);
        assertEquals(2, r.size());
        assertFalse(r.stream().anyMatch(p -> "A".equals(p.getId())), "sans prevente");
        ActiviteAnalysesDTO.Prevente b = r.stream().filter(p -> "B".equals(p.getId())).findFirst().get();
        assertEquals(100.0, b.getTaux(), "toutes abandonnees");
        assertEquals(0.0, b.getLignesParPrevente());
        ActiviteAnalysesDTO.Prevente c = r.stream().filter(p -> "C".equals(p.getId())).findFirst().get();
        assertEquals(0, c.getEncaissees(), "jamais negatif");
        assertEquals("?", c.getNom());
        assertEquals(100.0, c.getTaux());
    }
}
