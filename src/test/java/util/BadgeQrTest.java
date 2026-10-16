package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class BadgeQrTest {

    @Test
    void contenuEtLectureDuNumero() {
        String c = BadgeQr.contenu("BDG00012", "jdupont", "abc");
        assertEquals("PRESTIGE-BADGE|1|BDG00012|jdupont|abc", c);
        assertEquals("BDG00012", BadgeQr.numero(c));
        assertEquals("BDG00012", BadgeQr.numero(" BDG00012 "));
        assertEquals("BDG00012", BadgeQr.numero(BadgeQr.contenu("BDG00012", null, "x")));
        assertNull(BadgeQr.numero(null));
    }

    @Test
    void secretAleatoireEtEmpreinte() {
        String a = BadgeQr.nouveauSecret(), b = BadgeQr.nouveauSecret();
        assertNotEquals(a, b);
        assertTrue(a.length() >= 43 && !a.contains("|"));
        assertEquals(64, BadgeQr.empreinte(a).length());
        // SHA-256("abc"), valeur de reference
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", BadgeQr.empreinte("abc"));
    }

    @Test
    void champsPourLaConnexion() {
        String[] c = BadgeQr.champs(" " + BadgeQr.contenu("PGB-26-00017-K", "jdupont", "s3cr") + "\n");
        assertEquals("PGB-26-00017-K", c[0]);
        assertEquals("jdupont", c[1]);
        assertEquals("s3cr", c[2]);
        assertNull(BadgeQr.champs(null));
        assertNull(BadgeQr.champs("PGB-26-00017-K"));
        assertNull(BadgeQr.champs("PRESTIGE-BADGE|1|PGB-26-00017-K"));
        assertNull(BadgeQr.champs("PRESTIGE-BADGE|2|PGB-26-00017-K|jdupont|s3cr"));
        assertNull(BadgeQr.champs("PRESTIGE-BADGE|1|PGB-26-00017-K|jdupont|"));
        assertNull(BadgeQr.champs("PRESTIGE-BADGE|1|PGB-26-00017-K||s3cr"));
        assertNull(BadgeQr.champs("PRESTIGE-BADGE|1|PGB-26-00017-K|jdupont|s3cr|x"));
        assertNull(BadgeQr.champs("AUTRE|1|PGB-26-00017-K|jdupont|s3cr"));
    }
}
