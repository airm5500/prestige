package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Ordre des lignes d'une facture, tel qu'il est demande sur la fiche du tiers payant.
 *
 * Une valeur absente ou inattendue ne doit jamais faire echouer une edition : on retombe sur l'ordre alphabetique.
 */
class TriFactureTest {

    @Test
    @DisplayName("La fiche reglee sur « date de bon » est reconnue, quelle que soit la casse ou les espaces")
    void parDateDeBon() {
        assertEquals(1, TriFacture.parDateDeBon("DATE_BON"));
        assertEquals(1, TriFacture.parDateDeBon("  date_bon  "));
    }

    @Test
    @DisplayName("Tout le reste reste l'ordre alphabetique")
    void parDefautAlphabetique() {
        assertEquals(0, TriFacture.parDateDeBon("ALPHABETIQUE"));
        assertEquals(0, TriFacture.parDateDeBon(null));
        assertEquals(0, TriFacture.parDateDeBon(""));
        assertEquals(0, TriFacture.parDateDeBon("n'importe quoi"));
    }
}
