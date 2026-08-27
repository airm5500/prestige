package rest.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Choix du decoupage du releve des factures de groupe.
 *
 * L'ecran envoie le mode demande. Une valeur absente ou inattendue ne doit jamais faire echouer l'edition : on retombe
 * sur le decoupage de la liste.
 */
class ModeRegroupementTest {

    @Test
    @DisplayName("Le mode « par tiers payant » est reconnu, quelle que soit la casse ou les espaces")
    void parTiersPayant() {
        assertEquals(ReleveGroupeFactureService.PAR_TIERS_PAYANT, ReleveGroupeFactureService.normaliser("tierspayant"));
        assertEquals(ReleveGroupeFactureService.PAR_TIERS_PAYANT,
                ReleveGroupeFactureService.normaliser("  TiersPayant  "));
    }

    @Test
    @DisplayName("Tout le reste reste le decoupage de la liste")
    void parDefautParFactureDeGroupe() {
        assertEquals(ReleveGroupeFactureService.PAR_FACTURE_DE_GROUPE,
                ReleveGroupeFactureService.normaliser("facture"));
        assertEquals(ReleveGroupeFactureService.PAR_FACTURE_DE_GROUPE, ReleveGroupeFactureService.normaliser(null));
        assertEquals(ReleveGroupeFactureService.PAR_FACTURE_DE_GROUPE, ReleveGroupeFactureService.normaliser(""));
        assertEquals(ReleveGroupeFactureService.PAR_FACTURE_DE_GROUPE,
                ReleveGroupeFactureService.normaliser("n'importe quoi"));
    }
}
