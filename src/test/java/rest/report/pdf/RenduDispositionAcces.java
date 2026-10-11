package rest.report.pdf;

import com.itextpdf.text.pdf.BaseFont;
import etiquetagepro.disposition.Placement;
import java.util.List;

/** Acces des tests a la mise en page des textes de {@link RenduDisposition}. */
public final class RenduDispositionAcces {

    private RenduDispositionAcces() {
    }

    public static List<String> lignes(BaseFont police, String texte, Placement p) {
        return RenduDisposition.mettreEnPage(police, texte, p).lignes;
    }

    public static float taille(BaseFont police, String texte, Placement p) {
        return RenduDisposition.mettreEnPage(police, texte, p).taille;
    }
}
