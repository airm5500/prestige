package rest.service.mobile;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** O4 : seul le segment medicament est accepte, jamais une donnee du patient. */
class OrdonnanceCorrectionSegmentTest {

    private static String motif(String segment) {
        return MobileOrdonnanceCorrectionService.motifRefus("cle-1", segment, "P1", "1234567", "PRODUIT");
    }

    @Test
    @DisplayName("Segments medicament acceptes")
    void acceptes() {
        assertNull(motif("amoxicilline 1000 mg"));
        assertNull(motif("doliprane 500 mg cp"));
        assertNull(motif("augmentin 1 g/125 mg sachet"));
    }

    @Test
    @DisplayName("Nom et telephone, date, majuscules, trop court : refuses")
    void refuses() {
        assertNotNull(motif("Jean Dupont 06 12 34 56 78"));
        assertNotNull(motif("jean dupont 06 12 34 56 78"));
        assertNotNull(motif("ordonnance du 12/03/2025"));
        assertNotNull(motif("ab"));
        assertNotNull(motif("12345"));
    }
}
