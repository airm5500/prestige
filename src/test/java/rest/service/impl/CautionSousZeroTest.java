package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Une caution ne passe plus sous 0 (retour du 02/11, « Oui, bloquer ») : ni par une vente, ni par un ajustement.
 */
class CautionSousZeroTest {

    @Test
    void partCautionPlafonneeAuSolde() {
        assertEquals(3000, CautionTiersPayantServiceImpl.partCaution(10000, 3000));
        assertEquals(2500, CautionTiersPayantServiceImpl.partCaution(2500, 3000));
    }

    @Test
    void cautionVideOuNegativeNePrendRien() {
        /* avant : part negative, le client payait plus que le prix de la vente */
        assertEquals(0, CautionTiersPayantServiceImpl.partCaution(0, 3000));
        assertEquals(0, CautionTiersPayantServiceImpl.partCaution(-1500, 3000));
    }

    @Test
    void venteDansLeSoldeAcceptee() {
        assertNull(CautionTiersPayantServiceImpl.refusVente(5000, 5000));
        assertNull(CautionTiersPayantServiceImpl.refusVente(5000, 0));
    }

    @Test
    void venteAuDelaDuSoldeRefusee() {
        /* solde consomme entre le calcul du net et la cloture (autre poste) */
        String msg = CautionTiersPayantServiceImpl.refusVente(2000, 3500);
        assertNotNull(msg);
        assertTrue(msg.contains("2.000") || msg.contains("2 000"), msg);
        assertTrue(msg.contains("3.500") || msg.contains("3 500"), msg);
    }

    @Test
    void ajustementQuiPasseSousZeroRefuse() {
        String msg = CautionTiersPayantServiceImpl.refusAjustement(4000, -5000);
        assertNotNull(msg);
        assertTrue(msg.contains("sous 0"), msg);
        assertNull(CautionTiersPayantServiceImpl.refusAjustement(4000, -4000));
        assertNull(CautionTiersPayantServiceImpl.refusAjustement(4000, 1000));
    }

    @Test
    void cautionNegativePeutEtreRemontee() {
        /* avant : « Impossible de reduire le montant » meme pour un versement ; un versement est toujours accepte */
        assertNull(CautionTiersPayantServiceImpl.refusAjustement(-1500, 2000));
        assertNull(CautionTiersPayantServiceImpl.refusAjustement(-1500, 1000));
        assertNotNull(CautionTiersPayantServiceImpl.refusAjustement(-1500, -100));
    }
}
