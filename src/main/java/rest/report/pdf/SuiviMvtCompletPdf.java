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
import commonTasks.dto.MvtProduitCompletDTO;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Editions PDF du "Suivi mouvement article complet", generees avec iText : aucun template Jasper a deployer sur les
 * serveurs. Mise en page calquee sur l'edition de la gestion des surstocks : titre centre, bandeau d'en-tete gris,
 * toutes les colonnes lisibles sur une ligne en A4 paysage, pied de page "Imprime par" + numero de page.
 */
public final class SuiviMvtCompletPdf {

    private static final Logger LOG = Logger.getLogger(SuiviMvtCompletPdf.class.getName());

    private static final Font TITRE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
    private static final Font SOUS_TITRE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
    private static final Font ENTETE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f);
    private static final Font CELLULE = FontFactory.getFont(FontFactory.HELVETICA, 6.5f);
    private static final Font TOTAL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f);
    private static final Font PIED = FontFactory.getFont(FontFactory.HELVETICA, 7f);
    private static final BaseColor GRIS_ENTETE = new BaseColor(0xE8, 0xE8, 0xE8);
    // Meme code couleur que la fenetre de detail a l'ecran : vert = stock rayon, orange = stock reserve.
    private static final Font STOCK_RAYON = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f,
            new BaseColor(0x1B, 0x7D, 0x32));
    private static final Font STOCK_RESERVE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f,
            new BaseColor(0xE6, 0x73, 0x00));
    /** Flux classiques (sorties/entrees) : ils touchent le stock RAYON, donc en vert non gras. */
    private static final Font FLUX_RAYON = FontFactory.getFont(FontFactory.HELVETICA, 6.5f,
            new BaseColor(0x1B, 0x7D, 0x32));

    private SuiviMvtCompletPdf() {
    }

    /** Pied de page de chaque feuille : operateur a gauche, numero de page a droite. */
    private static final class Pied extends PdfPageEventHelper {

        private final String imprimePar;

        Pied(String imprimePar) {
            this.imprimePar = imprimePar == null ? "" : imprimePar;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Imprimé par : " + imprimePar, PIED),
                    document.leftMargin(), document.bottomMargin() - 12, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, new Phrase("Page " + writer.getPageNumber(), PIED),
                    document.getPageSize().getWidth() - document.rightMargin(), document.bottomMargin() - 12, 0);
        }
    }

    /** Liste generale : une ligne par article, memes colonnes que la grille de l'ecran. */
    public static byte[] liste(String officine, List<MvtProduitCompletDTO> lignes, String periode, String imprimePar) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 18, 18, 20, 30);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new Pied(imprimePar));
            doc.open();
            titre(doc, officine, "SUIVI MOUVEMENT ARTICLE COMPLET", "PERIODE " + periode);

            float[] largeurs = { 5.5f, 16f, 4f, 4f, 4.5f, 4.5f, 4.5f, 4.5f, 4.5f, 4.5f, 4.5f, 4.5f, 4.7f, 4.5f, 4.7f,
                    4f, 4f, 4.5f, 4.7f, 4.3f };
            PdfPTable table = new PdfPTable(largeurs);
            table.setWidthPercentage(100f);
            table.setHeaderRows(2);

            entete(table, "Cip", 1, 2);
            entete(table, "Désignation", 1, 2);
            entete(table, "Mouvements Sortie", 5, 1);
            entete(table, "Mouvements Entrée", 5, 1);
            entete(table, "Mouvements internes réserve", 3, 1);
            entete(table, "Qté.Inv", 1, 2);
            entete(table, "écart.Inv", 1, 2);
            entete(table, "Stock rayon", 1, 2);
            entete(table, "Stock réserve", 1, 2);
            entete(table, "Stock total", 1, 2);
            for (String h : new String[] { "Vente", "Ret.four", "Périmée", "Ajustée", "Décon", "Entrée", "Ajustée",
                    "Décon", "Annulée", "Ret.dépôt", "Vers réserve", "Vers rayon", "Ajust.rés." }) {
                entete(table, h, 1, 1);
            }

            for (MvtProduitCompletDTO o : lignes) {
                texte(table, o.getCip(), CELLULE);
                texte(table, o.getProduitName(), CELLULE);
                for (int v : new int[] { o.getQtyVente(), o.getQtyRetour(), o.getQtyPerime(), o.getQtyAjustSortie(),
                        o.getQtyDecondSortant(), o.getQtyEntree(), o.getQtyAjust(), o.getQtyDeconEntrant(),
                        o.getQtyAnnulation(), o.getQtyRetourDepot(), o.getQtyVersReserve(), o.getQtyVersRayon(),
                        o.getQtyAjustReserve(), o.getQtyInv(), o.getEcartInventaire(), o.getCurrentStock(),
                        o.getCurrentStockReserve(), o.getCurrentStockTotal() }) {
                    nombre(table, v, CELLULE);
                }
            }
            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste", e);
            return new byte[0];
        }
    }

    /**
     * Fiche des mouvements d'UN article, jour par jour : stocks rayon et reserve en debut et fin de journee, flux
     * classiques, mouvements internes de reserve, et ligne TOTAL.
     */
    public static byte[] ficheArticle(String officine, String article, String periode, String imprimePar,
            List<MvtProduitCompletDTO> jours, MvtProduitCompletDTO totaux) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 18, 18, 20, 30);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new Pied(imprimePar));
            doc.open();
            titre(doc, officine, "FICHE DES MOUVEMENTS DE L'ARTICLE " + article, "PERIODE " + periode);

            float[] largeurs = { 7f, 5f, 5f, 4.5f, 4.7f, 4.7f, 4.7f, 4.5f, 5f, 4.7f, 4.5f, 4.7f, 5f, 5f, 5f, 4.7f, 4.5f,
                    4.7f, 5f, 5f };
            PdfPTable table = new PdfPTable(largeurs);
            table.setWidthPercentage(100f);
            table.setHeaderRows(2);

            entete(table, "Date", 1, 2);
            entete(table, "Début de journée", 2, 1);
            entete(table, "Sortie", 5, 1);
            entete(table, "Entrée", 5, 1);
            entete(table, "Interne réserve", 3, 1);
            entete(table, "Inv", 1, 2);
            entete(table, "Ecart.Inv", 1, 2);
            entete(table, "Fin de journée", 2, 1);
            for (String h : new String[] { "Rayon", "Réserve", "Vente", "Ret.Four", "Périmé", "Ajustée", "Décon",
                    "Entrée", "Ajustée", "Décon", "Annulée", "Ret.Dépôt", "Vers rés.", "Vers rayon", "Ajust.rés.",
                    "Rayon", "Réserve" }) {
                entete(table, h, 1, 1);
            }

            for (MvtProduitCompletDTO j : jours) {
                texte(table, j.getDateOp(), CELLULE);
                nombre(table, j.getStockInit(), STOCK_RAYON);
                nombre(table, j.getStockReserveInit(), STOCK_RESERVE);
                // flux classiques : en vert, ils font varier le stock rayon
                for (int v : new int[] { j.getQtyVente(), j.getQtyRetour(), j.getQtyPerime(), j.getQtyAjustSortie(),
                        j.getQtyDecondSortant(), j.getQtyEntree(), j.getQtyAjust(), j.getQtyDeconEntrant(),
                        j.getQtyAnnulation(), j.getQtyRetourDepot() }) {
                    nombre(table, v, FLUX_RAYON);
                }
                // couleur = zone d'ou l'on PREND : vers reserve pris au rayon (vert), vers rayon
                // pris en reserve (orange). Les signes restent vus de la reserve : + entre, - sort.
                nombreSigne(table, j.getQtyVersReserve(), "+", STOCK_RAYON);
                nombreSigne(table, j.getQtyVersRayon(), "-", STOCK_RESERVE);
                nombreSigne(table, j.getQtyAjustReserve(), "+", STOCK_RESERVE);
                nombre(table, j.getQtyInv(), CELLULE);
                nombre(table, j.getEcartInventaire(), CELLULE);
                nombre(table, j.getStockFinal(), STOCK_RAYON);
                nombre(table, j.getStockReserveFinal(), STOCK_RESERVE);
            }

            // Ligne TOTAL : uniquement les flux (les stocks debut/fin ne s'additionnent pas entre jours)
            PdfPCell lblTotal = new PdfPCell(new Phrase("TOTAL", TOTAL));
            lblTotal.setColspan(3);
            lblTotal.setPadding(2f);
            table.addCell(lblTotal);
            for (int v : new int[] { totaux.getQtyVente(), totaux.getQtyRetour(), totaux.getQtyPerime(),
                    totaux.getQtyAjustSortie(), totaux.getQtyDecondSortant(), totaux.getQtyEntree(),
                    totaux.getQtyAjust(), totaux.getQtyDeconEntrant(), totaux.getQtyAnnulation(),
                    totaux.getQtyRetourDepot(), totaux.getQtyVersReserve(), totaux.getQtyVersRayon(),
                    totaux.getQtyAjustReserve(), totaux.getQtyInv() }) {
                nombre(table, v, TOTAL);
            }
            PdfPCell vide = new PdfPCell(new Phrase("", TOTAL));
            vide.setColspan(3);
            vide.setPadding(2f);
            table.addCell(vide);

            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "ficheArticle", e);
            return new byte[0];
        }
    }

    private static void titre(Document doc, String officine, String ligne1, String ligne2) throws Exception {
        if (officine != null && !officine.trim().isEmpty()) {
            Paragraph nom = new Paragraph(officine, SOUS_TITRE);
            nom.setAlignment(Element.ALIGN_LEFT);
            doc.add(nom);
        }
        Paragraph p = new Paragraph(ligne1, TITRE);
        p.setAlignment(Element.ALIGN_CENTER);
        doc.add(p);
        Paragraph p2 = new Paragraph(ligne2, SOUS_TITRE);
        p2.setAlignment(Element.ALIGN_CENTER);
        p2.setSpacingAfter(8f);
        doc.add(p2);
    }

    private static void entete(PdfPTable table, String texte, int colspan, int rowspan) {
        PdfPCell c = new PdfPCell(new Phrase(texte, ENTETE));
        c.setColspan(colspan);
        c.setRowspan(rowspan);
        c.setBackgroundColor(GRIS_ENTETE);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPadding(2.5f);
        table.addCell(c);
    }

    private static void texte(PdfPTable table, String valeur, Font police) {
        PdfPCell c = new PdfPCell(new Phrase(valeur == null ? "" : valeur, police));
        c.setPadding(2f);
        table.addCell(c);
    }

    private static void nombre(PdfPTable table, int valeur, Font police) {
        PdfPCell c = new PdfPCell(new Phrase(String.valueOf(valeur), police));
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c.setPadding(2f);
        table.addCell(c);
    }

    /**
     * Valeur precedee de son signe, avec une espace entre les deux ("+ 4", "- 4") ; une valeur negative garde son signe
     * naturel, zero s'affiche nu.
     */
    private static void nombreSigne(PdfPTable table, int valeur, String signePositif, Font police) {
        String texte;
        if (valeur > 0) {
            texte = signePositif + " " + valeur;
        } else if (valeur < 0) {
            texte = "- " + Math.abs(valeur);
        } else {
            texte = "0";
        }
        PdfPCell c = new PdfPCell(new Phrase(texte, police));
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c.setPadding(2f);
        table.addCell(c);
    }
}
