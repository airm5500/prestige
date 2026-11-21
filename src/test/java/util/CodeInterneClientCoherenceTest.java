package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Code interne d'un nouveau client (21/11) : six chiffres, jamais un code déjà pris, sur des milliers de bases tirées
 * au hasard (graine fixe), du cas vide au cas presque plein.
 */
class CodeInterneClientCoherenceTest {

    private static final long GRAINE = 21112026L;

    @Test
    void jamaisUnCodePrisToujoursSixChiffres() {
        Random tirage = new Random(GRAINE);
        for (int cas = 0; cas < 2000; cas++) {
            int nbPris = cas % 4 == 0 ? 0 : tirage.nextInt(cas % 4 == 3 ? 300000 : 30000);
            Set<String> pris = new HashSet<>();
            while (pris.size() < nbPris) {
                pris.add(String.valueOf(CodeInterneClient.MINIMUM
                        + tirage.nextInt(CodeInterneClient.MAXIMUM - CodeInterneClient.MINIMUM + 1)));
            }
            Random alea = new Random(GRAINE + cas);
            /* plusieurs créations à la suite : chaque code rejoint les codes pris */
            for (int creation = 0; creation < 1 + cas % 5; creation++) {
                String code = CodeInterneClient.libre(pris::contains, alea);
                assertTrue(code.matches("[1-9][0-9]{5}"), "cas " + cas + " : " + code);
                assertFalse(pris.contains(code), "cas " + cas + " : code déjà pris " + code);
                pris.add(code);
            }
        }
    }

    @Test
    void lesCodesPrisAuTiragesontEvites() {
        /* les premiers tirages de la graine sont tous pris : le code rendu est le premier libre */
        Random reference = new Random(7);
        Set<String> pris = new HashSet<>();
        for (int i = 0; i < 50; i++) {
            pris.add(String.valueOf(CodeInterneClient.MINIMUM + reference.nextInt(900000)));
        }
        String attendu = String.valueOf(CodeInterneClient.MINIMUM + reference.nextInt(900000));
        assertEquals(attendu, CodeInterneClient.libre(pris::contains, new Random(7)));
    }

    @Test
    void baseSaturéeRefuseeSansBoucler() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> CodeInterneClient.libre(code -> true, new Random(GRAINE)));
        assertTrue(e.getMessage().contains("code interne"));
    }

    @Test
    void lesCodesNeSeRepetentPasEntreEux() {
        Set<String> vus = new HashSet<>();
        for (int i = 0; i < 20000; i++) {
            String code = CodeInterneClient.libre(vus::contains);
            assertTrue(vus.add(code), code);
        }
        assertEquals(20000, vus.size());
    }
}
