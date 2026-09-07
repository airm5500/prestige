package util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Point 19 : la formule unique de la marge, celle de l'ecran « Marge sur produits ». */
class CalculMargeTest {

    @Test
    @DisplayName("Le montant hors taxes retire la remise et la TVA du prix de vente")
    void montantHt() {
        assertEquals(8_000L, CalculMarge.montantHt(10_000L, 500L, 1_500L));
    }

    @Test
    @DisplayName("La marge est le hors taxes diminue du prix d achat")
    void marge() {
        // 10 000 TTC, 500 de remise, 1 500 de TVA => 8 000 HT ; achat 6 000 => marge 2 000
        assertEquals(2_000L, CalculMarge.marge(10_000L, 500L, 1_500L, 6_000L));
    }

    @Test
    @DisplayName("Le pourcentage se rapporte au hors taxes, pas au prix d achat")
    void pourcentageSurLeHorsTaxes() {
        // 2 000 / 8 000 = 25 % ; rapporte a l'achat il aurait fallu lire 33,3 %
        assertEquals(25.0d, CalculMarge.pourcentage(10_000L, 500L, 1_500L, 6_000L), 0.001d);
    }

    @Test
    @DisplayName("Une vente a perte donne une marge et un pourcentage negatifs")
    void margeNegative() {
        assertEquals(-1_000L, CalculMarge.marge(10_000L, 500L, 1_500L, 9_000L));
        assertEquals(-12.5d, CalculMarge.pourcentage(10_000L, 500L, 1_500L, 9_000L), 0.001d);
    }

    @Test
    @DisplayName("Un hors taxes nul ne produit ni division par zero ni « NaN »")
    void horsTaxesNul() {
        assertEquals(0d, CalculMarge.pourcentage(0L, 0L, 0L, 0L), 0.001d);
        assertEquals(0d, CalculMarge.pourcentage(1_000L, 0L, 1_000L, 0L), 0.001d);
    }

    @Test
    @DisplayName("Le pourcentage est arrondi a une decimale")
    void arrondi() {
        // 1 / 3 => 33,3 %
        assertEquals(33.3d, CalculMarge.pourcentage(1_000L, 0L, 0L, 667L), 0.001d);
    }

    @Test
    @DisplayName("Sans remise ni TVA, la marge est l ecart simple entre vente et achat")
    void casSimple() {
        assertEquals(4_000L, CalculMarge.marge(10_000L, 0L, 0L, 6_000L));
        assertEquals(40.0d, CalculMarge.pourcentage(10_000L, 0L, 0L, 6_000L), 0.001d);
    }
}
