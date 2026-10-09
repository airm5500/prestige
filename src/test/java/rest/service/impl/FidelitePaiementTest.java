package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import javax.ejb.ApplicationException;
import org.junit.jupiter.api.Test;

/** Paiement d'une vente avec des points : conversion du montant et refus qui annule la cloture. */
class FidelitePaiementTest {

    @Test
    void pointsArrondisAuPointSuperieur() {
        assertEquals(10, FideliteService.pointsPour(50, 5));
        assertEquals(11, FideliteService.pointsPour(51, 5), "le point entame est du");
        assertEquals(1, FideliteService.pointsPour(1, 5));
        assertEquals(0, FideliteService.pointsPour(0, 5));
        assertEquals(0, FideliteService.pointsPour(100, 0), "valeur du point nulle : aucun paiement");
        assertEquals(2_000_000, FideliteService.pointsPour(10_000_000, 5));
    }

    @Test
    void refusAnnuleLaTransaction() {
        ApplicationException a = FideliteService.PaiementPointsRefuse.class.getAnnotation(ApplicationException.class);
        assertNotNull(a, "le refus arrive tel quel a la ressource (message clair)");
        assertEquals(true, a.rollback(), "la vente n'est pas enregistree");
    }
}
