package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Generateur de code CIP interne. On ne teste pas le hasard, on teste ce qui doit etre vrai quel que soit le tirage :
 * la forme du code, le respect du prefixe, l'evitement des codes pris, et l'arret quand la plage est epuisee.
 */
class CodeCipGenerateurTest {

    private static final Random ALEA = new Random(20260901);

    @Test
    @DisplayName("Le code fait sept chiffres et commence par le prefixe")
    void formeDuCode() {
        CodeCipGenerateur g = new CodeCipGenerateur("999", ALEA, code -> false);
        for (int i = 0; i < 500; i++) {
            String code = g.generer();
            assertEquals(7, code.length(), "sept chiffres attendus, recu " + code);
            assertTrue(code.matches("[0-9]{7}"), "que des chiffres attendus, recu " + code);
            assertTrue(code.startsWith("999"), "prefixe 999 attendu, recu " + code);
        }
    }

    @Test
    @DisplayName("Un tirage bas est complete par des zeros, jamais raccourci")
    void tirageBasComplete() {
        // nextDouble() rend 0 : le tirage vaut 0, le code doit etre 9990000 et non 9990.
        Random zero = new Random() {
            @Override
            public double nextDouble() {
                return 0d;
            }
        };
        assertEquals("9990000", new CodeCipGenerateur("999", zero, code -> false).generer());
    }

    @Test
    @DisplayName("Un code deja pris est ecarte au profit du suivant")
    void codePrisEcarte() {
        Set<String> pris = new HashSet<>();
        CodeCipGenerateur temoin = new CodeCipGenerateur("999", new Random(7), code -> false);
        // Les trois premiers tirages de cette graine sont declares pris.
        for (int i = 0; i < 3; i++) {
            pris.add(temoin.generer());
        }
        CodeCipGenerateur g = new CodeCipGenerateur("999", new Random(7), pris::contains);
        String code = g.generer();
        assertTrue(!pris.contains(code), "le code rendu ne doit pas etre parmi les pris : " + code);
    }

    @Test
    @DisplayName("Plage epuisee : le generateur s'arrete avec un message clair au lieu de boucler")
    void plageEpuisee() {
        CodeCipGenerateur g = new CodeCipGenerateur("999", ALEA, code -> true);
        IllegalStateException e = assertThrows(IllegalStateException.class, g::generer);
        assertTrue(e.getMessage().contains("KEY_PREFIXE_CIP_INTERNE"), "le message doit nommer le parametre a changer");
    }

    @Test
    @DisplayName("Prefixe absent, non numerique ou trop long : on retombe sur 999")
    void prefixeInutilisable() {
        assertEquals("999", CodeCipGenerateur.prefixeUtilisable(null));
        assertEquals("999", CodeCipGenerateur.prefixeUtilisable("  "));
        assertEquals("999", CodeCipGenerateur.prefixeUtilisable("9A9"));
        assertEquals("999", CodeCipGenerateur.prefixeUtilisable("1234567"), "sept chiffres ne laissent rien de libre");
        assertEquals("998", CodeCipGenerateur.prefixeUtilisable(" 998 "),
                "un prefixe valide est garde, espaces retires");
        assertEquals("9", CodeCipGenerateur.prefixeUtilisable("9"), "un prefixe court est accepte");
    }

    @Test
    @DisplayName("La capacite suit le prefixe : 10 000 codes derriere 999, un million derriere 9")
    void capacite() {
        assertEquals(10_000L, new CodeCipGenerateur("999", ALEA, c -> false).capacite());
        assertEquals(1_000_000L, new CodeCipGenerateur("9", ALEA, c -> false).capacite());
    }

    @Test
    @DisplayName("Un prefixe plus long laisse moins de chiffres libres mais toujours sept au total")
    void prefixeLong() {
        String code = new CodeCipGenerateur("99999", ALEA, c -> false).generer();
        assertEquals(7, code.length());
        assertTrue(code.startsWith("99999"));
    }
}
