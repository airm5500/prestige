package util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * La regle « mobile money » : les operateurs historiques toujours reconnus, les types classes en base ajoutes, et la
 * distinction entre operateurs a colonne propre et « autres » pour les rapports.
 */
class MobileMoneyTest {

    @AfterEach
    void remise() {
        MobileMoney.definirDepuisLaBase(Collections.emptySet());
    }

    @Test
    @DisplayName("Les sept operateurs historiques sont reconnus sans rien charger de la base")
    void historiques() {
        for (String id : new String[] { "7", "8", "9", "10", "19", "70", "80" }) {
            assertTrue(MobileMoney.est(id), id + " doit etre reconnu");
        }
        assertFalse(MobileMoney.est("1"), "les especes ne sont pas du mobile money");
        assertFalse(MobileMoney.est("3"), "la carte bancaire non plus");
        assertFalse(MobileMoney.est(null));
    }

    @Test
    @DisplayName("Un type classe MOBILE_MONEY en base est reconnu, et il compte comme « autre operateur »")
    void nouveauType() {
        assertFalse(MobileMoney.est("21"));
        MobileMoney.definirDepuisLaBase(Set.of("21"));
        assertTrue(MobileMoney.est("21"));
        assertTrue(MobileMoney.estAutreOperateur("21"), "pas de colonne propre : il va dans le total mobile");
        assertFalse(MobileMoney.estAutreOperateur("7"), "Orange a sa colonne");
        assertFalse(MobileMoney.estAutreOperateur("1"), "les especes ne sont pas un operateur");
        assertTrue(MobileMoney.identifiants().contains("21"));
        assertTrue(MobileMoney.identifiants().contains("7"));
    }

    @Test
    @DisplayName("Remplacer la liste venue de la base ne retire jamais un operateur historique")
    void historiquesJamaisRetires() {
        MobileMoney.definirDepuisLaBase(Set.of("21"));
        MobileMoney.definirDepuisLaBase(Collections.emptySet());
        assertTrue(MobileMoney.est("7"));
        assertFalse(MobileMoney.est("21"));
    }

    @Test
    @DisplayName("La categorie se lit sans se soucier de la casse ni des espaces")
    void categorie() {
        assertTrue(MobileMoney.estCategorieMobileMoney("MOBILE_MONEY"));
        assertTrue(MobileMoney.estCategorieMobileMoney(" mobile_money "));
        assertFalse(MobileMoney.estCategorieMobileMoney("STANDARD"));
        assertFalse(MobileMoney.estCategorieMobileMoney(null));
    }
}
