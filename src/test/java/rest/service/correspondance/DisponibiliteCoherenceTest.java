package rest.service.correspondance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.correspondance.DisponibiliteRegles.Source;

/**
 * Coherence des regles de disponibilite a la demande (lot 5), sur des milliers de cas tires avec une graine fixe :
 * <ul>
 * <li>reglage 0, 1, 2 : PharmaML seul, extranet seul, les deux (PharmaML d'abord) ; tout autre reglage : PharmaML seul
 * (comportement d'avant) ; jamais de liste vide ni de source en double ;</li>
 * <li>cache : rendu seulement si la lecture a moins de 15 minutes, n'est pas dans le futur et n'est pas forcee ; age de
 * 15 minutes pile : relu.</li>
 * </ul>
 */
class DisponibiliteCoherenceTest {

    private static final long GRAINE = 20261110L;

    @Test
    void sourcesSelonLeReglage() {
        assertEquals(Arrays.asList(Source.PHARMAML), DisponibiliteRegles.sources(0));
        assertEquals(Arrays.asList(Source.EXTRANET), DisponibiliteRegles.sources(1));
        assertEquals(Arrays.asList(Source.PHARMAML, Source.EXTRANET), DisponibiliteRegles.sources(2));
        assertEquals(Arrays.asList(Source.PHARMAML), DisponibiliteRegles.sources(null));
        Random r = new Random(GRAINE);
        for (int i = 0; i < 5_000; i++) {
            int reglage = r.nextInt(40) - 20;
            List<Source> s = DisponibiliteRegles.sources(reglage);
            assertFalse(s.isEmpty());
            assertEquals(s.size(), s.stream().distinct().count(), "source en double");
            assertEquals(reglage == 1 || reglage == 2, s.contains(Source.EXTRANET));
            assertEquals(reglage != 1, s.contains(Source.PHARMAML));
            assertEquals(reglage >= 0 && reglage <= 2, DisponibiliteRegles.reglageValide(reglage));
        }
    }

    @Test
    void booleensLusEnBase() {
        // tinyint(1) arrive en Boolean, une comparaison SQL en Long ou BigInteger, un tinyint(4) en Byte ou Integer
        assertTrue(DisponibiliteRegles.vrai(Boolean.TRUE));
        assertFalse(DisponibiliteRegles.vrai(Boolean.FALSE));
        assertFalse(DisponibiliteRegles.vrai(null));
        assertFalse(DisponibiliteRegles.vrai("1"));
        assertTrue(DisponibiliteRegles.vrai(java.math.BigInteger.ONE));
        assertFalse(DisponibiliteRegles.vrai(java.math.BigInteger.ZERO));
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < 5_000; i++) {
            int v = r.nextInt(5) - 2;
            boolean attendu = v != 0;
            assertEquals(attendu, DisponibiliteRegles.vrai((byte) v));
            assertEquals(attendu, DisponibiliteRegles.vrai(v));
            assertEquals(attendu, DisponibiliteRegles.vrai((long) v));
        }
    }

    @Test
    void cacheDeQuinzeMinutes() {
        Random r = new Random(GRAINE + 1);
        long maintenant = 1_794_200_000_000L;
        int rendus = 0, relus = 0;
        for (int i = 0; i < 20_000; i++) {
            Long lecture = r.nextInt(10) == 0 ? null : maintenant - (r.nextInt(40 * 60) - 120) * 1000L;
            boolean forcer = r.nextInt(5) == 0;
            boolean attendu = !forcer && lecture != null && lecture <= maintenant
                    && maintenant - lecture < 15 * 60_000L;
            boolean vu = DisponibiliteRegles.cacheValide(lecture, maintenant, forcer);
            assertEquals(attendu, vu, lecture + " " + forcer);
            if (vu) {
                rendus++;
            } else {
                relus++;
            }
        }
        assertTrue(rendus > 3_000 && relus > 3_000, rendus + " / " + relus);
        assertTrue(DisponibiliteRegles.cacheValide(maintenant - (15 * 60_000L - 1), maintenant, false));
        assertFalse(DisponibiliteRegles.cacheValide(maintenant - 15 * 60_000L, maintenant, false));
        assertFalse(DisponibiliteRegles.cacheValide(maintenant + 1, maintenant, false));
        assertFalse(DisponibiliteRegles.cacheValide(maintenant, maintenant, true));
    }
}
