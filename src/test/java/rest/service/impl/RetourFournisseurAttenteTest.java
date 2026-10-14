package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Retours du 13/10 (point 1) : un retour fournisseur ne sort du stock qu'une fois. Seuls un retour en saisie ou en
 * attente de validation peuvent etre valides ; un retour deja valide ou supprime est refuse.
 */
class RetourFournisseurAttenteTest {

    @Test
    void enSaisieOuEnAttenteSeValide() {
        assertTrue(MvtProduitServiceImpl.retourAValider("is_Process"));
        assertTrue(MvtProduitServiceImpl.retourAValider(MvtProduitServiceImpl.RETOUR_EN_ATTENTE));
    }

    @Test
    void dejaValideOuSupprimeNeSeRevalidePas() {
        assertFalse(MvtProduitServiceImpl.retourAValider("enable"));
        assertFalse(MvtProduitServiceImpl.retourAValider("delete"));
        assertFalse(MvtProduitServiceImpl.retourAValider(null));
    }
}
