package rest.service.impl;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.LocationTextExtractionStrategy;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import java.io.IOException;
import java.io.InputStream;

/**
 * Retours du 09/10 (5) : texte d'un releve grossiste en PDF, page par page, dans l'ordre de lecture (une ligne du
 * tableau = une ligne de texte), pour {@link ReleveGrossiste#lire(String)}. Un PDF scanne (image) ne contient pas de
 * texte : le releve est alors vide et l'ecran le dit.
 */
public final class ReleveGrossistePdf {

    /** Garde-fou : au-dela, le fichier n'est pas un releve. */
    public static final int PAGES_MAX = 200;

    private ReleveGrossistePdf() {
    }

    public static String texte(InputStream pdf) throws IOException {
        PdfReader lecteur = new PdfReader(pdf);
        try {
            StringBuilder sb = new StringBuilder();
            int n = Math.min(lecteur.getNumberOfPages(), PAGES_MAX);
            for (int i = 1; i <= n; i++) {
                sb.append(PdfTextExtractor.getTextFromPage(lecteur, i, new LocationTextExtractionStrategy()))
                        .append('\n');
            }
            return sb.toString();
        } finally {
            lecteur.close();
        }
    }
}
