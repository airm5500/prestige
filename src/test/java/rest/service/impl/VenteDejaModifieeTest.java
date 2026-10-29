package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import dal.TPreenregistrement;
import util.Constant;

/**
 * Vente issue d'une vente modifiee (signale le 29/10, vente 261029_00003) : la copie cloturee porte
 * lg_PREENGISTREMENT_ANNULE_ID comme une contre-passation. Elle doit rester modifiable et annulable ; seule la
 * contre-passation (jamais une copie) est refusee.
 */
class VenteDejaModifieeTest {

    private static TPreenregistrement vente(boolean copie, String annule) {
        TPreenregistrement tp = new TPreenregistrement();
        tp.setStrSTATUT(Constant.STATUT_IS_CLOSED);
        tp.setBISCANCEL(false);
        tp.setCopy(copie);
        tp.setLgPREENGISTREMENTANNULEID(annule);
        return tp;
    }

    @Test
    void copieClotureeDUneModificationNEstPasUneContrePassation() {
        TPreenregistrement copie = vente(true, "vente-d-origine");
        assertFalse(SalesServiceImpl.estContrePassation(copie));
        assertNull(SalesServiceImpl.refusAnnulation(copie));
    }

    @Test
    void contrePassationResteRefusee() {
        TPreenregistrement annulation = vente(false, "vente-d-origine");
        assertTrue(SalesServiceImpl.estContrePassation(annulation));
        assertEquals("Cette vente est l'annulation d'une autre vente : elle ne s'annule pas.",
                SalesServiceImpl.refusAnnulation(annulation));
    }

    @Test
    void venteOrdinaire() {
        assertFalse(SalesServiceImpl.estContrePassation(vente(false, null)));
        assertNull(SalesServiceImpl.refusAnnulation(vente(false, null)));
    }
}
