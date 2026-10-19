package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfReader;
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

    @Test
    void une_carte_par_page_sans_badge_donne_un_pdf_lisible() throws Exception {
        PdfReader r = new PdfReader(BadgePdf.ecrire(cartes(0, true), "Pharmacie du test", true));
        assertEquals(1, r.getNumberOfPages());
        r.close();
    }
}
