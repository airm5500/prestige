package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.PdfWriter;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import com.itextpdf.text.BaseColor;
import dal.TFacture;
import dal.TOfficine;
import dal.TTiersPayant;
import java.io.ByteArrayOutputStream;
import java.util.Calendar;
import java.util.Date;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * L'en-tete de la facture d'un modele dynamique doit se repeter sur CHAQUE page.
 *
 * <p>
 * Le defaut corrige ici : l'en-tete etait ajoute une seule fois au fil du document. Une facture de plusieurs pages
 * arrivait donc en page 2 avec le seul bandeau des colonnes, sans le nom de l'officine, sans le numero de facture et
 * sans le nom de l'organisme. Reçue detachee, une page du milieu ne disait plus de qui elle venait ni a qui elle
 * s'adressait.
 * </p>
 */
class EnteteFactureDynamiqueTest {

    private static final String OFFICINE = "GDE PHIE DE LA CAPITALE";
    private static final String PHARMACIEN = "Dr KRA MICHEL";
    private static final String ORGANISME = "MUPEMENET";
    private static final String NUMERO_FACTURE = "5719";

    private static Date jour(int annee, int mois, int jour) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(annee, mois - 1, jour);
        return c.getTime();
    }

    private static TFacture facture() {
        TFacture f = new TFacture();
        f.setStrCODEFACTURE(NUMERO_FACTURE);
        f.setDtDEBUTFACTURE(jour(2026, 7, 1));
        f.setDtFINFACTURE(jour(2026, 7, 31));
        f.setDtCREATED(jour(2026, 8, 1));
        return f;
    }

    private static TTiersPayant tiersPayant() {
        TTiersPayant tp = new TTiersPayant();
        tp.setStrFULLNAME(ORGANISME);
        tp.setStrADRESSE("YAMOUSSOUKRO");
        return tp;
    }

    private static TOfficine officine() {
        TOfficine o = new TOfficine();
        o.setStrNOMABREGE(OFFICINE);
        o.setStrFIRSTNAME("Dr KRA");
        o.setStrLASTNAME("MICHEL");
        return o;
    }

    /**
     * Fabrique un document de plusieurs pages avec le meme habillage que la facture reelle, et renvoie le texte de
     * chaque page.
     */
    private static String[] pagesImprimees(boolean avecEntete, int nombreDeParagraphes) throws Exception {
        ModelFactureDynamiqueRessource ressource = new ModelFactureDynamiqueRessource();
        Font fontInstitution = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font fontSousTitre = FontFactory.getFont(FontFactory.HELVETICA, 8);
        PdfPTable entete = avecEntete
                ? ressource.construireEntete(facture(), tiersPayant(), officine(), fontInstitution, fontSousTitre)
                : null;
        float hauteurEntete = 0f;
        if (entete != null) {
            entete.setTotalWidth(PageSize.A4.getWidth() - 10);
            entete.setLockedWidth(true);
            hauteurEntete = entete.getTotalHeight();
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 5, 5, 20 + hauteurEntete + 8, 40);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        writer.setPageEvent(new ModelFactureDynamiqueRessource.HabillagePage(entete, new BaseColor(204, 204, 204)));
        document.open();
        // De quoi remplir plusieurs pages : c'est justement le cas ou le defaut se voyait.
        for (int i = 0; i < nombreDeParagraphes; i++) {
            Paragraph p = new Paragraph("Ligne de bon numero " + i, FontFactory.getFont(FontFactory.HELVETICA, 10));
            p.setAlignment(Element.ALIGN_LEFT);
            document.add(p);
        }
        document.close();

        PdfReader lecteur = new PdfReader(out.toByteArray());
        String[] pages = new String[lecteur.getNumberOfPages()];
        for (int i = 0; i < pages.length; i++) {
            pages[i] = PdfTextExtractor.getTextFromPage(lecteur, i + 1);
        }
        lecteur.close();
        return pages;
    }

    @Test
    @DisplayName("Sur une facture de plusieurs pages, chaque page porte l'en-tete complet")
    void enteteSurChaquePage() throws Exception {
        String[] pages = pagesImprimees(true, 200);
        assertTrue(pages.length >= 3,
                "il faut plusieurs pages pour que le controle ait un sens, obtenu " + pages.length);
        for (int i = 0; i < pages.length; i++) {
            String page = pages[i];
            int numero = i + 1;
            assertTrue(page.contains(OFFICINE), "page " + numero + " : le nom de l'officine manque");
            assertTrue(page.contains(PHARMACIEN), "page " + numero + " : le nom du pharmacien manque");
            assertTrue(page.contains("FACTURE N° " + NUMERO_FACTURE),
                    "page " + numero + " : le numero de facture manque");
            assertTrue(page.contains("PERIODE DU 01/07/2026 AU 31/07/2026"),
                    "page " + numero + " : la periode facturee manque");
            assertTrue(page.contains(ORGANISME), "page " + numero + " : le nom de l'organisme manque");
            assertTrue(page.contains("Page " + numero), "page " + numero + " : le numero de page manque");
        }
    }

    @Test
    @DisplayName("Sans en-tete demande, aucune page n'en porte")
    void sansEntete() throws Exception {
        String[] pages = pagesImprimees(false, 200);
        assertTrue(pages.length >= 3, "il faut plusieurs pages pour que le controle ait un sens");
        for (String page : pages) {
            assertTrue(!page.contains(OFFICINE) && !page.contains("FACTURE N°"),
                    "l'en-tete ne doit pas sortir quand le modele ne le demande pas");
        }
    }

    @Test
    @DisplayName("Le cartouche porte le numero, la periode, la date et l'organisme")
    void contenuDuCartouche() throws Exception {
        String premiere = pagesImprimees(true, 5)[0];
        assertTrue(premiere.contains("FACTURE N° " + NUMERO_FACTURE), "le numero de facture manque");
        assertTrue(premiere.contains("PERIODE DU 01/07/2026 AU 31/07/2026"), "la periode manque");
        assertTrue(premiere.contains(ORGANISME), "le nom de l'organisme manque");
        assertTrue(premiere.contains("YAMOUSSOUKRO"), "l'adresse de l'organisme manque");
    }

    @Test
    @DisplayName("Une facture courte tient sur une page et la porte une seule fois")
    void factureCourte() throws Exception {
        String[] pages = pagesImprimees(true, 3);
        assertEquals(1, pages.length, "trois lignes doivent tenir sur une seule page");
        assertTrue(pages[0].contains(OFFICINE), "l'en-tete doit sortir sur cette page unique");
    }
}
