package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 14 : code PIN du badge. Regles verifiees :
 * <ul>
 * <li>les 10 000 codes : accepte si et seulement si 4 chiffres, pas quatre fois le meme, pas une suite (montante ou
 * descendante) ; tout le reste (3 ou 5 chiffres, lettres, espaces, vide, null) refuse ;</li>
 * <li>empreinte : jamais le code en clair, meme code + meme sel = meme empreinte, autre sel = autre empreinte ; le bon
 * code est accepte, les 9 999 autres refuses ;</li>
 * <li>decision : parametre absent ou a 0 = badge seul (comme avant) ; a 1 = code a definir, a taper, faux ou juste ;
 * session ouverte seulement si ACCEPTE.</li>
 * </ul>
 */
class BadgePinCoherenceTest {

    /** iterations reduites pour tirer des milliers de cas ; la regle ne depend pas du nombre d'iterations */
    private static final int IT = 50;

    static boolean facileAttendu(String p) {
        Set<Character> c = new HashSet<>();
        for (char x : p.toCharArray()) {
            c.add(x);
        }
        if (c.size() == 1) {
            return true;
        }
        return "0123456789".contains(p) || "9876543210".contains(p);
    }

    @Test
    void lesDixMilleCodes() {
        int acceptes = 0;
        for (int i = 0; i < 10000; i++) {
            String p = String.format("%04d", i);
            boolean attendu = !facileAttendu(p);
            assertEquals(attendu, BadgePin.refusFormat(p) == null, p);
            acceptes += attendu ? 1 : 0;
        }
        /* 10 identiques, 7 montantes, 7 descendantes */
        assertEquals(10000 - 10 - 7 - 7, acceptes);
    }

    @Test
    void formatsRefuses() {
        Random r = new Random(140811);
        for (String p : new String[] { null, "", " ", "123", "12345", "12a4", "١٢٣٤", " 1357", "13 57", "abcd" }) {
            assertNotNull(BadgePin.refusFormat(p), String.valueOf(p));
        }
        for (int i = 0; i < 5000; i++) {
            int n = 1 + r.nextInt(8);
            StringBuilder sb = new StringBuilder();
            for (int k = 0; k < n; k++) {
                sb.append((char) (r.nextBoolean() ? '0' + r.nextInt(10) : 'a' + r.nextInt(26)));
            }
            String p = sb.toString();
            boolean quatreChiffres = p.matches("[0-9]{4}");
            assertEquals(quatreChiffres && !facileAttendu(p), BadgePin.refusFormat(p) == null, p);
        }
    }

    @Test
    void empreintesSurDesMilliersDeCodes() {
        Random r = new Random(8112026);
        Set<String> sels = new HashSet<>();
        for (int i = 0; i < 2000; i++) {
            String p = String.format("%04d", r.nextInt(10000));
            String sel = BadgePin.nouveauSel();
            assertTrue(sels.add(sel), "sel jamais repete");
            String e = BadgePin.empreinte(p, sel, IT);
            assertFalse(e.contains(p) && e.length() < 8, "jamais le code en clair");
            assertEquals(64, e.length());
            assertEquals(e, BadgePin.empreinte(p, sel, IT), "meme code, meme sel : meme empreinte");
            assertNotEquals(e, BadgePin.empreinte(p, BadgePin.nouveauSel(), IT), "autre sel : autre empreinte");
            assertTrue(BadgePin.verifier(p, sel, e, IT));
            String autre = String.format("%04d", (Integer.parseInt(p) + 1 + r.nextInt(9999)) % 10000);
            assertFalse(BadgePin.verifier(autre, sel, e, IT), p + " / " + autre);
            assertFalse(BadgePin.verifier(p, BadgePin.nouveauSel(), e, IT));
            assertFalse(BadgePin.verifier(null, sel, e, IT));
            assertFalse(BadgePin.verifier(p, null, e, IT));
            assertFalse(BadgePin.verifier(p, sel, null, IT));
            assertFalse(BadgePin.verifier(p + "0", sel, e, IT));
        }
    }

    @Test
    void seulLeBonCodeOuvre() {
        String sel = BadgePin.nouveauSel(), bon = "2580";
        String e = BadgePin.empreinte(bon, sel, IT);
        int ouverts = 0;
        for (int i = 0; i < 10000; i++) {
            ouverts += BadgePin.verifier(String.format("%04d", i), sel, e, IT) ? 1 : 0;
        }
        assertEquals(1, ouverts);
        /* avec le vrai nombre d'iterations aussi */
        String vrai = BadgePin.empreinte(bon, sel);
        assertTrue(BadgePin.verifier(bon, sel, vrai));
        assertFalse(BadgePin.verifier("2581", sel, vrai));
    }

    @Test
    void decision() {
        Random r = new Random(14);
        for (int i = 0; i < 20000; i++) {
            boolean demande = r.nextBoolean(), defini = r.nextBoolean(), juste = r.nextBoolean();
            String tape = r.nextInt(4) == 0 ? (r.nextBoolean() ? null : "  ") : String.format("%04d", r.nextInt(10000));
            BadgePin.Etat e = BadgePin.etat(demande, defini, tape, juste);
            BadgePin.Etat attendu = !demande ? BadgePin.Etat.ACCEPTE
                    : !defini ? BadgePin.Etat.PIN_A_DEFINIR : tape == null || tape.trim().isEmpty()
                            ? BadgePin.Etat.PIN_REQUIS : juste ? BadgePin.Etat.ACCEPTE : BadgePin.Etat.PIN_FAUX;
            assertEquals(attendu, e);
            /* jamais ouvert avec le code demande et faux */
            if (demande && defini && tape != null && !tape.trim().isEmpty() && !juste) {
                assertNotEquals(BadgePin.Etat.ACCEPTE, e);
            }
        }
    }

    @Test
    void parametre() {
        assertFalse(BadgePin.demande(null), "absent : badge seul (comme avant)");
        assertFalse(BadgePin.demande("0"));
        assertFalse(BadgePin.demande(""));
        assertFalse(BadgePin.demande("oui"));
        assertTrue(BadgePin.demande("1"));
        assertTrue(BadgePin.demande(" 1 "));
        assertNull(BadgePin.refusFormat("2580"));
    }
}
