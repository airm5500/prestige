package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Les adresses mail d'officine lues depuis la configuration : une cle absente ou vide ne doit jamais faire tomber
 * l'envoi des notifications, elle doit seulement le rendre impossible.
 */
class AdressesMailTest {

    @Test
    @DisplayName("Une cle absente (valeur nulle) ne donne aucun destinataire, sans exception")
    void cleAbsente() {
        assertTrue(AdressesMail.destinataires(null).isEmpty());
        assertNull(AdressesMail.premiere(null));
    }

    @Test
    @DisplayName("Une valeur vide ou blanche ne donne aucun destinataire")
    void valeurVide() {
        assertTrue(AdressesMail.destinataires("").isEmpty());
        assertTrue(AdressesMail.destinataires("   ").isEmpty());
        assertTrue(AdressesMail.destinataires(" ; ;").isEmpty());
    }

    @Test
    @DisplayName("Plusieurs adresses separees par des points-virgules, espaces tolerees, doublons ecartes")
    void plusieursAdresses() {
        assertEquals(Arrays.asList("a@officine.ci", "b@officine.ci"),
                AdressesMail.destinataires(" a@officine.ci ; b@officine.ci;; a@officine.ci "));
        assertEquals("a@officine.ci", AdressesMail.premiere("a@officine.ci;b@officine.ci"));
    }

    @Test
    @DisplayName("Une seule adresse est rendue telle quelle")
    void uneAdresse() {
        assertEquals(Arrays.asList("pharmacie@exemple.ci"), AdressesMail.destinataires("pharmacie@exemple.ci"));
    }
}
