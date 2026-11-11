package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 8 : niveaux de l'onglet « Assistance » (sauvegarde, disque, base) et durees affichees, verifies
 * par leurs regles sur des milliers de valeurs tirees au hasard (graine fixe), seuils compris.
 */
class EtatAssistanceCoherenceTest {

    private static final List<String> ORDRE = Arrays.asList(EtatAssistance.VERT, EtatAssistance.ORANGE,
            EtatAssistance.ROUGE);

    @Test
    void casDeBase() {
        assertEquals("ROUGE", EtatAssistance.sauvegarde(null));
        assertEquals("VERT", EtatAssistance.sauvegarde(0L));
        assertEquals("VERT", EtatAssistance.sauvegarde(26 * 60L));
        assertEquals("ORANGE", EtatAssistance.sauvegarde(26 * 60L + 1));
        assertEquals("ORANGE", EtatAssistance.sauvegarde(72 * 60L));
        assertEquals("ROUGE", EtatAssistance.sauvegarde(72 * 60L + 1));
        assertNull(EtatAssistance.disque(0, 0));
        assertEquals("ROUGE", EtatAssistance.disque(EtatAssistance.GO, 500 * EtatAssistance.GO));
        assertEquals("ORANGE", EtatAssistance.disque(50 * EtatAssistance.GO, 500 * EtatAssistance.GO));
        assertEquals("VERT", EtatAssistance.disque(148 * EtatAssistance.GO, 476 * EtatAssistance.GO));
        assertEquals("ROUGE", EtatAssistance.base(-1));
        assertEquals("VERT", EtatAssistance.base(200));
        assertEquals("ORANGE", EtatAssistance.base(201));
        assertEquals("ROUGE", EtatAssistance.base(1001));
        assertEquals("2 j 4 h", EtatAssistance.duree(2 * 1440 + 4 * 60 + 59));
        assertEquals("3 h 12 min", EtatAssistance.duree(192));
        assertEquals("0 min", EtatAssistance.duree(-5));
        assertEquals("148,0 Go", EtatAssistance.go(148 * EtatAssistance.GO));
        assertEquals("7.6.40", EtatAssistance.plusHauteVersion(Arrays.asList("7.6.7", "7.6.40", "7.6.20", null, "x")));
        assertEquals("", EtatAssistance.plusHauteVersion(Arrays.asList()));
    }

    @Test
    void plusHauteVersionSurDesMilliersDeListes() {
        Random r = new Random(20261112L);
        for (int i = 0; i < 3000; i++) {
            java.util.List<int[]> l = new java.util.ArrayList<>();
            java.util.List<String> textes = new java.util.ArrayList<>();
            for (int k = 0, n = 1 + r.nextInt(30); k < n; k++) {
                int[] v = { r.nextInt(9), r.nextInt(12), r.nextInt(60) };
                l.add(v);
                textes.add(v[0] + "." + v[1] + "." + v[2]);
            }
            int[] max = l.stream().max(java.util.Comparator.<int[]> comparingInt(v -> v[0]).thenComparingInt(v -> v[1])
                    .thenComparingInt(v -> v[2])).get();
            java.util.Collections.shuffle(textes, r);
            assertEquals(max[0] + "." + max[1] + "." + max[2], EtatAssistance.plusHauteVersion(textes));
        }
    }

    @Test
    void reglesSurDesMilliersDeValeurs() {
        Random r = new Random(20261111L);
        for (int i = 0; i < 8000; i++) {
            /* sauvegarde : un niveau qui ne baisse jamais quand l'age augmente */
            long a = r.nextInt(6 * 1440), b = a + r.nextInt(3 * 1440);
            assertTrue(ORDRE.indexOf(EtatAssistance.sauvegarde(a)) <= ORDRE.indexOf(EtatAssistance.sauvegarde(b)),
                    a + " / " + b);
            assertEquals(a <= 26 * 60 ? "VERT" : a <= 72 * 60 ? "ORANGE" : "ROUGE", EtatAssistance.sauvegarde(a));

            /* disque : plus d'espace libre, jamais un niveau plus grave ; regle des seuils */
            long total = (1 + r.nextInt(2000)) * EtatAssistance.GO / (1 + r.nextInt(4));
            long libre = (long) (r.nextDouble() * total),
                    plus = Math.min(total, libre + (long) (r.nextDouble() * total));
            String n = EtatAssistance.disque(libre, total);
            assertTrue(ORDRE.indexOf(EtatAssistance.disque(plus, total)) <= ORDRE.indexOf(n), libre + " / " + plus);
            double part = (double) libre / total;
            String attendu = part < 0.05 || libre < 2 * EtatAssistance.GO ? "ROUGE"
                    : part < 0.15 || libre < 10 * EtatAssistance.GO ? "ORANGE" : "VERT";
            assertEquals(attendu, n, libre + " / " + total);
            assertNull(EtatAssistance.disque(total + 1, total));

            /* base : plus lente, jamais mieux */
            long ms = r.nextInt(3000) - 1, ms2 = ms + r.nextInt(3000);
            if (ms >= 0) {
                assertTrue(ORDRE.indexOf(EtatAssistance.base(ms)) <= ORDRE.indexOf(EtatAssistance.base(ms2)));
            }

            /* duree : jours, heures et minutes recomposent le temps (a la minute pres, ou a l'heure pres en jours) */
            long m = r.nextInt(30 * 1440);
            String d = EtatAssistance.duree(m);
            String[] p = d.split(" ");
            long recompose = d.contains(" j ") ? Long.parseLong(p[0]) * 1440 + Long.parseLong(p[2]) * 60
                    : d.contains(" h ") ? Long.parseLong(p[0]) * 60 + Long.parseLong(p[2]) : Long.parseLong(p[0]);
            assertTrue(recompose <= m && m - recompose < (d.contains(" j ") ? 60 : 1), d + " / " + m);
        }
    }
}
