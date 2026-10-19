package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Impression des badges : planche A4 de dix cartes (par defaut) ou une carte par page au format exact 85,6 x 54 mm pour
 * une imprimante a cartes PVC (demande du 17/10).
 */
class BadgePdfTest {

    private static final float MM = 72f / 25.4f;

    private static List<BadgePdf.Carte> cartes(int n, boolean qr) {
        BadgePdf.Carte[] t = new BadgePdf.Carte[n];
        for (int i = 0; i < n; i++) {
            t[i] = new BadgePdf.Carte("PGB-26-0000" + i, "KONE", "Awa", "Vendeuse", "M" + i, LocalDate.of(2027, 10, 1),
                    qr ? "PRESTIGE-BADGE|1|PGB-26-0000" + i + "|awa|secret" : null);
        }
        return Arrays.asList(t);
    }

    @Test
    void planche_a4_par_defaut_dix_cartes_par_page() throws Exception {
        PdfReader r = new PdfReader(BadgePdf.ecrire(cartes(12, true), "Pharmacie du test"));
        assertEquals(2, r.getNumberOfPages());
        assertEquals(595f, r.getPageSize(1).getWidth(), 1f);
        r.close();
    }

    @Test
    void une_carte_par_page_au_format_carte_bancaire() throws Exception {
        for (boolean qr : new boolean[] { true, false }) {
            PdfReader r = new PdfReader(BadgePdf.ecrire(cartes(3, qr), "Pharmacie du test", true));
            assertEquals(3, r.getNumberOfPages());
            for (int p = 1; p <= 3; p++) {
                Rectangle t = r.getPageSize(p);
                assertEquals(85.6f * MM, t.getWidth(), 0.5f);
                assertEquals(54f * MM, t.getHeight(), 0.5f);
            }
            r.close();
        }
    }

    /** demande du 19/10 : nom et prenoms sur une seule ligne, en QR code comme en code-barres, sur les deux formats */
    @Test
    void nom_et_prenoms_sur_une_ligne() throws Exception {
        for (boolean qr : new boolean[] { true, false }) {
            for (boolean unParPage : new boolean[] { true, false }) {
                PdfReader r = new PdfReader(BadgePdf.ecrire(cartes(1, qr), "Pharmacie du test", unParPage));
                String texte = PdfTextExtractor.getTextFromPage(r, 1);
                r.close();
                assertTrue(texte.contains("KONE Awa"), "qr=" + qr + " carte=" + unParPage + " :\n" + texte);
            }
        }
    }

    /** nom long : tout le nom de famille reste lisible sur la ligne (police reduite, prenoms abreges au besoin) */
    @Test
    void nom_long_garde_le_nom_de_famille_entier() throws Exception {
        BadgePdf.Carte c = new BadgePdf.Carte("PGB-26-00009-K", "KOUADIO-ASSEMIAN", "Marie-Christelle Ahou Aya",
                "Préparatrice", "M9", LocalDate.of(2027, 10, 1), "PRESTIGE-BADGE|1|PGB-26-00009-K|mca|secret");
        PdfReader r = new PdfReader(BadgePdf.ecrire(Arrays.asList(c), "Pharmacie du test", true));
        String texte = PdfTextExtractor.getTextFromPage(r, 1);
        r.close();
        assertTrue(texte.contains("KOUADIO-ASSEMIAN Marie"), texte);
    }

    @Test
    void une_carte_par_page_sans_badge_donne_un_pdf_lisible() throws Exception {
        PdfReader r = new PdfReader(BadgePdf.ecrire(cartes(0, true), "Pharmacie du test", true));
        assertEquals(1, r.getNumberOfPages());
        r.close();
    }
}
