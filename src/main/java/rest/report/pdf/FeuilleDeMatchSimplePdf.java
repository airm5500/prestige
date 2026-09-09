package rest.report.pdf;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import commonTasks.dto.FeuilleDeMatchSimpleLigneDTO;

/**
 * La feuille de match SIMPLE (retour du 09/09) : Rang, Produit, CIP13, UG, Quantites achetees, Frequence d'achat.
 *
 * <p>
 * Le modele fourni par l'officine est un tableau de six colonnes, trie par quantites achetees, les ex aequo partageant
 * un rang « 17-21 ». C'est ce tableau, rien de plus : l'edition detaillee existante garde ses quatre mois.
 * </p>
 */
public final class FeuilleDeMatchSimplePdf {

    private static final Logger LOG = Logger.getLogger(FeuilleDeMatchSimplePdf.class.getName());

    private static final String[] COLONNES = { "Rang", "Produit", "CIP13", "UG", "Quantités achetées",
            "Fréquence d'achat" };
    private static final float[] LARGEURS = { 8f, 44f, 14f, 7f, 14f, 13f };

    private FeuilleDeMatchSimplePdf() {
    }

    public static byte[] construire(List<FeuilleDeMatchSimpleLigneDTO> lignes, String officine, String periode,
            String imprimePar) {
        Document document = new Document(PageSize.A4, 24, 24, 24, 24);
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, sortie);
            document.open();
            Font titre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font sousTitre = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font entetes = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
            Font cellule = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font gras = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);

            document.add(new Paragraph(officine == null ? "" : officine, titre));
            document.add(new Paragraph("FEUILLE DE MATCH SIMPLE", titre));
            document.add(new Paragraph(periode == null ? "" : periode, sousTitre));
            document.add(new Paragraph("Imprimé par : " + (imprimePar == null ? "" : imprimePar), sousTitre));
            document.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(COLONNES.length);
            table.setWidthPercentage(100);
            table.setWidths(LARGEURS);
            table.setHeaderRows(1);
            for (int i = 0; i < COLONNES.length; i++) {
                PdfPCell hc = new PdfPCell(new Phrase(COLONNES[i], entetes));
                hc.setGrayFill(0.88f);
                hc.setBorder(Rectangle.BOTTOM);
                hc.setPadding(3f);
                hc.setHorizontalAlignment(i >= 3 ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                table.addCell(hc);
            }
            long totalQuantite = 0;
            for (FeuilleDeMatchSimpleLigneDTO l : lignes == null ? List.<FeuilleDeMatchSimpleLigneDTO> of() : lignes) {
                table.addCell(cellule(l.getRang(), gras, false));
                table.addCell(cellule(l.getProduit(), cellule, false));
                table.addCell(cellule(l.getCip13(), cellule, false));
                table.addCell(cellule(String.valueOf(l.getUg()), cellule, true));
                table.addCell(cellule(nombre(l.getQuantite()), gras, true));
                table.addCell(cellule(String.valueOf(l.getFrequence()), cellule, true));
                totalQuantite += l.getQuantite();
            }
            PdfPCell pied = new PdfPCell(
                    new Phrase("TOTAL (" + (lignes == null ? 0 : lignes.size()) + " produit(s))", entetes));
            pied.setColspan(4);
            pied.setGrayFill(0.92f);
            pied.setBorder(Rectangle.TOP);
            pied.setPadding(3f);
            table.addCell(pied);
            PdfPCell total = new PdfPCell(new Phrase(nombre(totalQuantite), entetes));
            total.setGrayFill(0.92f);
            total.setBorder(Rectangle.TOP);
            total.setPadding(3f);
            total.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(total);
            PdfPCell vide = new PdfPCell(new Phrase("", entetes));
            vide.setGrayFill(0.92f);
            vide.setBorder(Rectangle.TOP);
            table.addCell(vide);
            document.add(table);
            document.close();
            return sortie.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "feuille de match simple", e);
            return new byte[0];
        }
    }

    private static PdfPCell cellule(String texte, Font police, boolean droite) {
        PdfPCell c = new PdfPCell(new Phrase(texte == null ? "" : texte, police));
        c.setBorder(Rectangle.BOTTOM);
        c.setBorderColor(java.awt.Color.LIGHT_GRAY);
        c.setPadding(2.5f);
        c.setHorizontalAlignment(droite ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
        return c;
    }

    private static String nombre(long valeur) {
        return String.format(java.util.Locale.FRANCE, "%,d", valeur).replace(' ', ' ').replace(' ', ' ');
    }
}
