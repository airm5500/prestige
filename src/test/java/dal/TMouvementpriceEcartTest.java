package dal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Ecart du mouchard des prix : nouveau - ancien, comme le trigger t_mouvementprice_before_insert. Avant, la vente
 * ecrivait ancien - nouveau et la commande laissait l'ecart vide quand le trigger etait absent.
 */
class TMouvementpriceEcartTest {

    private static TMouvementprice mouvement(Integer ancien, Integer nouveau) {
        TMouvementprice m = new TMouvementprice("id");
        m.setIntPRICEOLD(ancien);
        m.setIntPRICENEW(nouveau);
        m.calculerEcart();
        return m;
    }

    @Test
    @DisplayName("Hausse de prix : ecart positif")
    void hausse() {
        assertEquals(50, mouvement(1050, 1100).getIntECART());
    }

    @Test
    @DisplayName("Baisse de prix : ecart negatif")
    void baisse() {
        assertEquals(-125, mouvement(2635, 2510).getIntECART());
    }

    @Test
    @DisplayName("Un prix manquant : l'ecart n'est pas invente")
    void prixManquant() {
        assertNull(mouvement(null, 1100).getIntECART());
    }
}
