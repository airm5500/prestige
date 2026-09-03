package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ClotureVenteParams;
import org.junit.jupiter.api.Test;

/** Controle des montants de la charge de cloture, fait avant toute modification de la vente. */
class ClotureMontantsTest {

    private static ClotureVenteParams charge(Integer recu, Integer paye) {
        ClotureVenteParams p = new ClotureVenteParams();
        p.setMontantRecu(recu);
        p.setMontantPaye(paye);
        return p;
    }

    @Test
    void montantsRenseignesAcceptes() {
        assertNull(SalesServiceImpl.controleMontantsCloture(charge(1320, 1320)));
        assertNull(SalesServiceImpl.controleMontantsCloture(charge(1500, 1320)));
        assertNull(SalesServiceImpl.controleMontantsCloture(charge(0, 0)));
    }

    @Test
    void montantRecuNulRefuse() {
        // cas constate en officine : champ mobile money vide -> montantRecu NaN -> null
        String message = SalesServiceImpl.controleMontantsCloture(charge(null, 1320));
        assertNotNull(message);
        assertTrue(message.contains("mode mobile"));
    }

    @Test
    void montantPayeNulRefuse() {
        assertNotNull(SalesServiceImpl.controleMontantsCloture(charge(1320, null)));
    }

    @Test
    void montantsNegatifsRefuses() {
        assertNotNull(SalesServiceImpl.controleMontantsCloture(charge(-5, 1320)));
        assertNotNull(SalesServiceImpl.controleMontantsCloture(charge(1320, -5)));
    }

    @Test
    void chargeAbsenteRefusee() {
        assertNotNull(SalesServiceImpl.controleMontantsCloture(null));
    }
}
