package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 28/10 (point 22) : avoirs annonces au client seulement pour un produit vraiment arrive. */
class AvoirNotifiableTest {

    @Test
    @DisplayName("Produit entre, stock positif : le client est prevenu")
    void disponible() {
        assertTrue(AvoirNotifiable.produitDisponible(3, 3, false));
    }

    @Test
    @DisplayName("Facture non livre (rien d'entre, ou retour FNL) ou stock a zero : pas de message")
    void pasDeMessage() {
        assertFalse(AvoirNotifiable.produitDisponible(0, 5, false), "aucune quantite entree");
        assertFalse(AvoirNotifiable.produitDisponible(2, 2, true), "retour facture non livre");
        assertFalse(AvoirNotifiable.produitDisponible(2, 0, false), "stock a zero apres l'entree");
        assertFalse(AvoirNotifiable.produitDisponible(2, -1, false), "stock negatif");
    }
}
