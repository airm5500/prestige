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
        assertEquals(ModeRegroupement.PAR_TIERS_PAYANT, ModeRegroupement.normaliser("tierspayant"));
        assertEquals(ModeRegroupement.PAR_TIERS_PAYANT, ModeRegroupement.normaliser("  TiersPayant  "));
    }

    @Test
    @DisplayName("Tout le reste reste le decoupage de la liste")
    void parDefautParFactureDeGroupe() {
        assertEquals(ModeRegroupement.PAR_FACTURE_DE_GROUPE, ModeRegroupement.normaliser("facture"));
        assertEquals(ModeRegroupement.PAR_FACTURE_DE_GROUPE, ModeRegroupement.normaliser(null));
        assertEquals(ModeRegroupement.PAR_FACTURE_DE_GROUPE, ModeRegroupement.normaliser(""));
        assertEquals(ModeRegroupement.PAR_FACTURE_DE_GROUPE, ModeRegroupement.normaliser("n'importe quoi"));
    }
}
