package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Calendar;
import java.util.Date;
import org.junit.jupiter.api.Test;

/**
 * Refus du retrait d'un produit sur une vente qui n'est plus en cours. Ce cas remontait en erreur 500 (contrainte
 * hmvtproduit) et laissait la caissiere devant « server-side failure with status code500 ».
 */
class RetraitLigneVenteTest {

    private static Date leTroisSeptembre() {
        Calendar c = Calendar.getInstance();
        c.set(2026, Calendar.SEPTEMBER, 3, 21, 26, 0);
        return c.getTime();
    }

    @Test
    void leMessageNommeLaVenteDitQuandEtOuLaModifier() {
        String message = SalesServiceImpl.messageVenteNonModifiable("260903_00049", leTroisSeptembre());
        assertTrue(message.contains("260903_00049"), message);
        assertTrue(message.contains("clôturée"), message);
        assertTrue(message.contains("03/09/2026 21:26"), message);
        assertTrue(message.contains("Ventes terminées"), message);
    }

    @Test
    void referenceOuDateAbsentesNeProduisentPasDeNull() {
        assertFalse(SalesServiceImpl.messageVenteNonModifiable(null, null).contains("null"));
        assertFalse(SalesServiceImpl.messageVenteNonModifiable("", leTroisSeptembre()).contains("N° "));
        assertTrue(SalesServiceImpl.messageVenteNonModifiable(null, null).contains("Ventes terminées"));
    }
}
