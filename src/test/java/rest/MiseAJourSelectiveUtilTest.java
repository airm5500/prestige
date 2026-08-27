package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Lecture de ce que l'ecran de mise a jour selective envoie.
 *
 * Une mise a jour en masse touche des dizaines d'organismes d'un coup : ce qui est teste ici, c'est qu'une saisie
 * douteuse ne se transforme jamais en modification silencieuse.
 */
class MiseAJourSelectiveUtilTest {

    @Test
    @DisplayName("Les tiers payants coches sont lus dans l'ordre, sans doublon")
    void identifiantsLus() {
        assertEquals(Arrays.asList("TP1", "TP2", "TP3"),
                MiseAJourSelectiveUtil.identifiants("[\"TP1\",\"TP2\",\"TP3\"]"));
        assertEquals(Arrays.asList("TP1", "TP2"), MiseAJourSelectiveUtil.identifiants("[\"TP1\",\"TP2\",\"TP1\"]"),
                "un tiers payant coche deux fois n'est traite qu'une fois");
    }

    @Test
    @DisplayName("Les entrees vides sont ecartees, jamais prises pour un identifiant")
    void entreesVides() {
        assertEquals(Arrays.asList("TP1"), MiseAJourSelectiveUtil.identifiants("[\"TP1\",\"\",\"   \",null]"));
    }

    @Test
    @DisplayName("Une liste illisible ne designe AUCUN tiers payant, jamais tous")
    void listeIllisible() {
        assertTrue(MiseAJourSelectiveUtil.identifiants("ceci n'est pas du JSON").isEmpty());
        assertTrue(MiseAJourSelectiveUtil.identifiants("{\"tp\":\"TP1\"}").isEmpty());
        assertTrue(MiseAJourSelectiveUtil.identifiants("").isEmpty());
        assertTrue(MiseAJourSelectiveUtil.identifiants(null).isEmpty());
    }

    @Test
    @DisplayName("Un reglage laisse vide vaut « ne pas y toucher », et non zero")
    void reglageVide() {
        assertNull(MiseAJourSelectiveUtil.entierOuNull(null));
        assertNull(MiseAJourSelectiveUtil.entierOuNull(""));
        assertNull(MiseAJourSelectiveUtil.entierOuNull("   "));
        assertNull(MiseAJourSelectiveUtil.entierOuNull("automatique"),
                "une valeur illisible ne doit rien modifier non plus");
    }

    @Test
    @DisplayName("Un reglage renseigne est lu tel quel, espaces compris")
    void reglageRenseigne() {
        assertEquals(Integer.valueOf(25), MiseAJourSelectiveUtil.entierOuNull("25"));
        assertEquals(Integer.valueOf(7), MiseAJourSelectiveUtil.entierOuNull("  7 "));
        // Zero est une valeur choisie : « automatique ». Elle doit passer, contrairement au vide.
        assertEquals(Integer.valueOf(0), MiseAJourSelectiveUtil.entierOuNull("0"));
    }
}
