package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.Test;

/** Le taux de marque enregistre sur la fiche a l'entree en stock. */
public class TauxMarqueTest {

    @Test
    public void tauxDepuisLesPrixDeLaFiche() {
        assertEquals(50, TauxMarque.calculer(1000, 500));
        assertEquals(33, TauxMarque.calculer(1500, 1000)); // 33,33 arrondi
        assertEquals(0, TauxMarque.calculer(1000, 1000));
        assertEquals(-20, TauxMarque.calculer(1000, 1200)); // vente a perte : le taux le dit
    }

    @Test
    public void prixManquantOuNulLaisseLaFicheIntacte() {
        assertNull(TauxMarque.calculer(null, 500));
        assertNull(TauxMarque.calculer(1000, null));
        assertNull(TauxMarque.calculer(0, 500));
        assertNull(TauxMarque.calculer(1000, -1));
    }
}
