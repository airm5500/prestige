package rest.report.pdf;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.ColumnText;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfPageEventHelper;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Retours du 10/10 : edition PDF d'une liste a l'ecran (previsions, rappels, fidelite...), generee avec iText : aucun
 * modele a deployer. A4 paysage, nom de l'officine, titre et sous-titre (filtres), en-tete gris repete sur chaque page,
 * colonnes numeriques a droite, pied « Imprimé le ... par ... » et numero de page.
 */
public final class TableauPdf {

    private static final Font TITRE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
    private static final Font SOUS_TITRE = FontFactory.getFont(FontFactory.HELVETICA, 8.5f);
    private static final Font OFFICINE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
    private static final Font ENTETE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f);
    private static final Font CELLULE = FontFactory.getFont(FontFactory.HELVETICA, 7f);
    private static final Font PIED = FontFactory.getFont(FontFactory.HELVETICA, 7f);
    private static final BaseColor GRIS_ENTETE = new BaseColor(0xE8, 0xE8, 0xE8);

    /** Description de l'edition. */
    public static final class Edition {
        public String officine, titre, sousTitre, imprimePar;
        public String[] entetes;
        public float[] largeurs;
        /** colonnes alignees a droite (nombres) */
        public boolean[] droite;
    }

    private TableauPdf() {
    }

    private static final class Pied extends PdfPageEventHelper {
        private final String texte;

        Pied(String texte) {
            this.texte = texte;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase(texte, PIED), document.leftMargin(),
                    document.bottomMargin() - 12, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, new Phrase("Page " + writer.getPageNumber(), PIED),
                    document.getPageSize().getWidth() - document.rightMargin(), document.bottomMargin() - 12, 0);
        }
    }

    public static byte[] generer(Edition e, List<String[]> lignes) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 18, 18, 20, 30);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(
                    new Pied("Imprimé le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                            + (e.imprimePar == null || e.imprimePar.isEmpty() ? "" : " par " + e.imprimePar)));
            doc.open();
            if (e.officine != null && !e.officine.trim().isEmpty()) {
                doc.add(new Paragraph(e.officine, OFFICINE));
            }
            Paragraph t = new Paragraph(e.titre == null ? "" : e.titre, TITRE);
            t.setAlignment(Element.ALIGN_CENTER);
            doc.add(t);
            Paragraph st = new Paragraph(e.sousTitre == null ? "" : e.sousTitre, SOUS_TITRE);
            st.setAlignment(Element.ALIGN_CENTER);
            st.setSpacingAfter(8f);
            doc.add(st);
            PdfPTable table = e.largeurs != null ? new PdfPTable(e.largeurs) : new PdfPTable(e.entetes.length);
            table.setWidthPercentage(100f);
            table.setHeaderRows(1);
            for (int i = 0; i < e.entetes.length; i++) {
                PdfPCell c = new PdfPCell(new Phrase(e.entetes[i], ENTETE));
                c.setBackgroundColor(GRIS_ENTETE);
                c.setHorizontalAlignment(Element.ALIGN_CENTER);
                c.setVerticalAlignment(Element.ALIGN_MIDDLE);
                c.setPadding(3f);
                table.addCell(c);
            }
            for (String[] l : lignes) {
                for (int i = 0; i < e.entetes.length; i++) {
                    PdfPCell c = new PdfPCell(new Phrase(i < l.length && l[i] != null ? l[i] : "", CELLULE));
                    c.setHorizontalAlignment(e.droite != null && i < e.droite.length && e.droite[i]
                            ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                    c.setPadding(2.5f);
                    table.addCell(c);
                }
            }
            if (lignes.isEmpty()) {
                PdfPCell c = new PdfPCell(new Phrase("Aucune ligne.", CELLULE));
                c.setColspan(e.entetes.length);
                table.addCell(c);
            }
            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Édition PDF impossible", ex);
        }
    }
}
