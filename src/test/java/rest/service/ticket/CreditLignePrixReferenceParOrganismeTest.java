package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

/**
 * Lot « base par tiers-payant » (Q2.5), retour du 05/11 : quand les organismes d'une ligne n'ont pas la meme base,
 * chacun imprime SON prix de reference sur sa ligne de credit (« CNAM · P[2 335] * T[60%] : 1 401 » depuis le 06/11) et
 * la ligne ne porte plus le « P.REF » unique ; avec une seule base, rien ne change.
 */
class CreditLignePrixReferenceParOrganismeTest {

    @Test
    void chaqueOrganismeImprimeSonPrixDeReference() {
        assertEquals("CNAM · P[2 335] * T[60%] : 1 401", CreditLigne.libelle("CNAM", 2335, 60, 1401));
        assertEquals("MUPEMENET · P[1 835] * T[30%] : 551", CreditLigne.libelle("MUPEMENET", 1835, 30, 551));
    }

    @Test
    void sansReferenceOuSurLePrixDeVenteLeLibelleEstCeluiDAujourdhui() {
        assertEquals("CNAM · Taux 70 % : 6 111", CreditLigne.libelle("CNAM", null, 70, 6111));
        assertEquals("Taux 70 % : 6 111", CreditLigne.libelle(null, null, 70, 6111));
        assertEquals(CreditLigne.libelle("CNAM", 70, 6111), CreditLigne.libelle("CNAM", null, 70, 6111));
    }

    @Test
    void lesBasesDifferentQuandDeuxOrganismesNontPasLaMemeBaseUnitaire() {
        assertTrue(CreditLigne.basesDifferentes(Arrays.asList(2335, 1835)));
        assertTrue(CreditLigne.basesDifferentes(Arrays.asList(4365, 4065)));
        assertFalse(CreditLigne.basesDifferentes(Arrays.asList(3000, 3000)));
        assertFalse(CreditLigne.basesDifferentes(Arrays.asList(3000)));
        assertFalse(CreditLigne.basesDifferentes(Arrays.asList(null, null)));
        // un organisme sans base propre (null) compte comme « la base de la ligne » : pas de difference a lui seul
        assertFalse(CreditLigne.basesDifferentes(Arrays.asList(3000, null)));
    }
}
