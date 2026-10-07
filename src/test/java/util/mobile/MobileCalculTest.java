package util.mobile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class MobileCalculTest {

    private static final byte[] CLE = "cle-de-test-0123456789abcdef".getBytes(StandardCharsets.UTF_8);
    private static final long T = 1_790_000_000L;

    @Test
    void jetonValideJusquaExpiration() {
        String j = JetonMobile.emettre(CLE, "term-1", "user-1", T + 3600);
        JetonMobile.Contenu c = JetonMobile.verifier(CLE, j, T).orElseThrow();
        assertEquals("term-1", c.terminal);
        assertEquals("user-1", c.utilisateur);
        assertFalse(JetonMobile.verifier(CLE, j, T + 3600).isPresent(), "expire");
    }

    @Test
    void jetonFalsifieRefuse() {
        String j = JetonMobile.emettre(CLE, "term-1", "user-1", T + 3600);
        String autre = JetonMobile.emettre(CLE, "term-1", "user-2", T + 3600);
        /* contenu d'un jeton avec la signature d'un autre : refuse */
        String melange = autre.substring(0, autre.indexOf('.')) + j.substring(j.indexOf('.'));
        assertFalse(JetonMobile.verifier(CLE, melange, T).isPresent());
        assertFalse(JetonMobile.verifier("autre-cle-0123456789".getBytes(StandardCharsets.UTF_8), j, T).isPresent());
        for (String n : new String[] { null, "", ".", "a.b.c", "!!!.???", j + "x", "x".repeat(700) }) {
            assertFalse(JetonMobile.verifier(CLE, n, T).isPresent(), String.valueOf(n));
        }
    }

    @Test
    void codePointageTourneChaqueMinuteEtTolereLaPrecedente() {
        long debut = T - Math.floorMod(T, 60);
        String c = CodePointage.code(CLE, debut);
        assertEquals(6, c.length());
        assertTrue(CodePointage.valide(CLE, c, debut + 59));
        assertTrue(CodePointage.valide(CLE, CodePointage.PREFIXE + c.toLowerCase(), debut + 30));
        assertTrue(CodePointage.valide(CLE, c, debut + 60 + 20), "periode precedente acceptee");
        assertFalse(CodePointage.valide(CLE, c, debut + 120 + 1), "deux minutes plus tard : refuse");
        assertFalse(CodePointage.valide(CLE, null, debut));
        assertFalse(CodePointage.valide(CLE, "ABC", debut));
        assertEquals(60, CodePointage.resteSec(debut));
        assertEquals(1, CodePointage.resteSec(debut + 59));
    }

    @Test
    void distanceGps() {
        /* Abidjan Plateau -> Cocody, environ 3,5 km ; 0,001 degre de latitude = 111 m */
        double d = Geo.distanceM(5.3200, -4.0200, 5.3210, -4.0200);
        assertTrue(Math.abs(d - 111.2) < 1, String.valueOf(d));
        assertEquals(0d, Geo.distanceM(5.3, -4.0, 5.3, -4.0), 1e-6);
        assertTrue(Geo.positionPlausible(5.3, -4.0));
        assertFalse(Geo.positionPlausible(0d, 0d));
        assertFalse(Geo.positionPlausible(95d, 0d));
        assertFalse(Geo.positionPlausible(null, 1d));
    }
}
