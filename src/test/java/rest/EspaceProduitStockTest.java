package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Stock affiche par l'espace produit : int_NUMBER_AVAILABLE est le stock rayon (un assort vers la reserve l'en retire),
 * le total est donc rayon + reserve. Auparavant le rayon etait calcule « total - reserve » et sortait negatif des que
 * l'article avait de la reserve (DOLIPRANE 500 : rayon -94 au lieu de 36, total 36 au lieu de 166).
 */
class EspaceProduitStockTest {

    @Test
    @DisplayName("Article avec reserve : le total ajoute la reserve au rayon")
    void totalAvecReserve() {
        assertEquals(166, EspaceProduitRessource.stockTotal(36, 130));
    }

    @Test
    @DisplayName("Article sans reserve : le total est le rayon")
    void totalSansReserve() {
        assertEquals(12, EspaceProduitRessource.stockTotal(12, 0));
    }

    @Test
    @DisplayName("Rayon negatif : il reste visible dans le total, sans ecretage")
    void rayonNegatifNonEcrete() {
        assertEquals(-3, EspaceProduitRessource.stockTotal(-3, 0));
    }
}
