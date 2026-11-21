package rest.report.pdf;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;

import org.junit.jupiter.api.Test;

/**
 * Affiche de l'avis client (plan du 21/11, point 10) : l'adresse du lien n'est plus imprimée sous le QR code ; le nom,
 * l'adresse de la pharmacie, le titre et l'invitation restent, en A4 comme en A5, pour des liens variés.
 */
class AvisAfficheTest {

    private static String texte(byte[] pdf) throws Exception {
        PdfReader r = new PdfReader(pdf);
        try {
            StringBuilder s = new StringBuilder();
            for (int i = 1; i <= r.getNumberOfPages(); i++) {
                s.append(PdfTextExtractor.getTextFromPage(r, i)).append('\n');
            }
            return s.toString();
        } finally {
            r.close();
        }
    }

    @Test
    void lAdresseDuLienNEstPlusImprimee() throws Exception {
        String[] liens = { "http://41.207.12.34:8090/avis?t=AbC123", "https://avis.pharmacie-exemple.ci/avis?t=Z9",
                "http://10.0.0.5:18090/prestige/avis?t=x-y_z" };
        for (String lien : liens) {
            for (boolean a5 : new boolean[] { false, true }) {
                String t = texte(AvisPdf.affiche("Pharmacie Essai", "Cocody Riviera 3", lien, a5));
                String base = lien.replaceAll("\\?t=.*", "");
                assertFalse(t.contains(base), "lien imprimé (" + (a5 ? "A5" : "A4") + ") : " + base);
                assertFalse(t.contains("http"), "une adresse web reste imprimée : " + t);
                assertTrue(t.contains("PHARMACIE ESSAI"), t);
                assertTrue(t.contains("Cocody Riviera 3"), t);
                assertTrue(t.contains("Votre avis nous intéresse"), t);
                assertTrue(t.contains("Scannez ce code"), t);
                assertTrue(t.contains("Merci de nous aider"), t);
            }
        }
    }
}
