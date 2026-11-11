package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Plan du 10/11, point 3 : reference courte d'une suggestion de reserve, le prefixe du sens suivi de 5 caracteres. Cent
 * mille tirages (graine fixe) : format exact, 12 caracteres, aucun caractere ambigu (0, O, 1, I, L), tous les
 * caracteres de l'alphabet utilises, repartition sans biais grossier, tres peu de collisions avant le controle
 * d'unicite en base.
 */
class ReferenceSuggestionCourteTest {

    @Test
    void formatAlphabetEtRepartition() {
        Random r = new Random(20261110L);
        Map<Character, Integer> compte = new HashMap<>();
        Set<String> vues = new HashSet<>();
        int collisions = 0;
        int n = 100_000;
        for (int i = 0; i < n; i++) {
            String prefixe = i % 2 == 0 ? "SR-RAY-" : "SR-RES-";
            String ref = SuggestionReserveServiceImpl.referenceCourte(prefixe, r);
            assertTrue(ref.matches("SR-(RAY|RES)-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}"), ref);
            assertEquals(12, ref.length(), ref);
            assertTrue(ref.startsWith(prefixe), ref);
            String fin = ref.substring(7);
            assertTrue(fin.chars().noneMatch(c -> "01OIL".indexOf(c) >= 0), ref);
            for (char c : fin.toCharArray()) {
                compte.merge(c, 1, Integer::sum);
            }
            if (!vues.add(ref)) {
                collisions++;
            }
        }
        assertEquals(SuggestionReserveServiceImpl.CARACTERES_REFERENCE.length(), compte.size(),
                "tous les caracteres sont tires");
        double attendu = 5.0 * n / compte.size();
        for (Map.Entry<Character, Integer> e : compte.entrySet()) {
            assertTrue(Math.abs(e.getValue() - attendu) < attendu * 0.05, e.getKey() + " : " + e.getValue());
        }
        /* 31^5 = 28,6 millions de references par sens : environ 87 collisions attendues sur 50 000 tirages par sens */
        assertTrue(collisions < 300, "collisions : " + collisions);
    }

    @Test
    void alphabetSansCaractereAmbigu() {
        String a = SuggestionReserveServiceImpl.CARACTERES_REFERENCE;
        assertEquals(31, a.length());
        assertEquals(a.length(), a.chars().distinct().count());
        assertTrue(a.chars().noneMatch(c -> "01OIL".indexOf(c) >= 0), a);
    }
}
