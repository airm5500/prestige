package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Calendar;
import java.util.Date;
import org.junit.jupiter.api.Test;

/**
 * Refus rendu a l'ecran quand la vente visee n'est plus modifiable : ces appels (ajout d'un produit, calcul du net
 * assurance) tombaient en erreur 500, sans rien dire a la caissiere.
 */
class ControleVenteModifiableTest {

    private static Date leUnSeptembre() {
        Calendar c = Calendar.getInstance();
        c.set(2026, Calendar.SEPTEMBER, 1, 10, 57, 0);
        return c.getTime();
    }

    @Test
    void venteClotureeRenvoieVersLesVentesTerminees() {
        String message = SalesServiceImpl.messageVenteNonModifiable("260901_00120", leUnSeptembre());
        assertTrue(message.contains("260901_00120"), message);
        assertTrue(message.contains("01/09/2026 10:57"), message);
        assertTrue(message.contains("Ventes terminées"), message);
    }

    @Test
    void aucuneReferenceNiDateNeProduitDeNull() {
        String message = SalesServiceImpl.messageVenteNonModifiable(null, null);
        assertFalse(message.contains("null"), message);
        assertTrue(message.contains("plus être modifiée"), message);
    }
}
