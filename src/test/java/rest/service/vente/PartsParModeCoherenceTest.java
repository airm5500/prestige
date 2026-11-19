package rest.service.vente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Defaut 3 du 19/11 (Pontmain) : part de chaque mode d'une vente. Regles, sur des milliers de ventes tirees au hasard
 * (graine fixe) : somme des parts = somme des reglements (vente detaillee) ou montant du mouvement (un seul reglement)
 * ; une vente a un seul reglement est lue comme avant (tout sur le mode du mouvement, quel que soit ce reglement) ; une
 * vente especes + mobile n'a en especes que sa part especes ; aucune part negative pour des montants positifs ; part()
 * = parts().get().
 */
public class PartsParModeCoherenceTest {

    private static final List<String> MODES = Arrays.asList("1", "2", "3", "4", "7", "8", "9", "10", "19");

    @Test
    void reglesSurDesMilliersDeVentes() {
        Random r = new Random(20261119L);
        int detaillees = 0, simples = 0, mixtesEspeces = 0;
        for (int cas = 0; cas < 20000; cas++) {
            String modeMvt = MODES.get(r.nextInt(MODES.size()));
            long montantMvt = (1 + r.nextInt(2000)) * 5L;
            int n = r.nextInt(4); // 0 : ancienne vente sans reglement detaille ; 1 : un ; 2-3 : plusieurs
            List<PartsParMode.Reglement> regl = new ArrayList<>();
            long somme = 0, especes = 0;
            for (int i = 0; i < n; i++) {
                String mode = i == 0 && r.nextBoolean() ? "1" : MODES.get(r.nextInt(MODES.size()));
                long montant = r.nextInt(10) == 0 ? 0 : (1 + r.nextInt(1500)) * 5L;
                regl.add(new PartsParMode.Reglement(r.nextInt(6) == 0 ? " " + mode + " " : mode, montant));
                somme += montant;
                if ("1".equals(mode)) {
                    especes += montant;
                }
            }
            Map<String, Long> parts = PartsParMode.parts(modeMvt, montantMvt, regl);
            long total = parts.values().stream().mapToLong(Long::longValue).sum();
            if (n > 1) {
                detaillees++;
                assertEquals(somme, total, "cas " + cas + " : somme des parts = somme des reglements");
                assertEquals(especes, PartsParMode.part("1", modeMvt, montantMvt, regl), "cas " + cas);
                if (especes > 0 && especes < somme) {
                    mixtesEspeces++;
                    assertTrue(PartsParMode.part("1", modeMvt, montantMvt, regl) < somme, "cas " + cas);
                }
            } else {
                simples++;
                assertEquals(Collections.singletonMap(modeMvt, montantMvt), parts, "cas " + cas + " : lu comme avant");
            }
            for (Map.Entry<String, Long> e : parts.entrySet()) {
                assertTrue(e.getValue() >= 0, "cas " + cas + " : part negative");
                assertEquals(e.getValue().longValue(), PartsParMode.part(e.getKey(), modeMvt, montantMvt, regl));
            }
            assertEquals(0, PartsParMode.part("99", modeMvt, montantMvt, regl));
        }
        assertTrue(detaillees > 5000 && simples > 5000 && mixtesEspeces > 1000,
                detaillees + " / " + simples + " / " + mixtesEspeces);
    }

    @Test
    void casDePontmain() {
        /* especes 2 110 + Wave 1 700, mouvement « especes 3 810 » : 2 110 en especes, 1 700 en Wave */
        List<PartsParMode.Reglement> v = Arrays.asList(new PartsParMode.Reglement("10", 1700),
                new PartsParMode.Reglement("1", 2110));
        assertEquals(2110, PartsParMode.part("1", "1", 3810, v));
        assertEquals(1700, PartsParMode.part("10", "1", 3810, v));
        /* vente especes seule : inchangee */
        assertEquals(3810, PartsParMode.part("1", "1", 3810, Arrays.asList(new PartsParMode.Reglement("1", 3810))));
        assertEquals(3810, PartsParMode.part("1", "1", 3810, null));
        assertEquals(0, PartsParMode.part("1", "10", 3810, null));
    }

    @Test
    void sqlSansSaisie() {
        String sql = PartsParMode.sqlPart("m", "montantPaye", "1");
        assertTrue(
                sql.contains("vrp.type_regelement = '1'") && sql.contains("m.typeReglementId = '1' THEN m.montantPaye"),
                sql);
        assertThrows(IllegalArgumentException.class, () -> PartsParMode.sqlPart("m", "montantPaye", "1' OR '1'='1"));
    }
}
