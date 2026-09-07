package rest.report.pdf;

import java.io.ByteArrayOutputStream;
import java.util.Comparator;
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

import commonTasks.dto.FactureDetailDTO;

/**
 * Edition d'une facture de carnet depot, SANS le detail des medicaments (point 17).
 *
 * <p>
 * Elle est alignee sur l'edition des factures provisoires et suit les regles demandees : une seule ligne par bon, la
 * DATE en premiere colonne, les lignes triees par date, ni « M.TOTAL » ni « M.ADHER » - un carnet depot n'a pas de part
 * adherent, ces deux colonnes n'y disaient rien - et aucune premiere page recapitulative.
 * </p>
 *
 * <p>
 * Elle est construite en code plutot que confiee a un modele jasper : les seize modeles de facture de l'officine
 * servent les autres tiers payants et ne doivent pas bouger, et l'edition du carnet depot a ses propres regles. Les
 * factures des autres tiers payants continuent donc de sortir exactement comme avant.
 * </p>
 */
public final class FactureCarnetDepotPdf {

    private static final Logger LOG = Logger.getLogger(FactureCarnetDepotPdf.class.getName());

    /** La date ouvre la ligne : c'est sur elle que l'edition est triee, et c'est elle qu'on cherche d'abord. */
    private static final String[] COLONNES = { "Date", "N° bon", "Bénéficiaire", "Matricule", "Montant" };

    private static final float[] LARGEURS = { 12f, 19f, 35f, 17f, 17f };

    private FactureCarnetDepotPdf() {
    }

    public static byte[] construire(List<FactureDetailDTO> bons, String entete, String numeroFacture,
            String tiersPayant, String periode, String imprimePar) {
        Document document = new Document(PageSize.A4, 24, 24, 24, 24);
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, sortie);
            document.open();

            Font titre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font sousTitre = FontFactory.getFont(FontFactory.HELVETICA, 7);
            Font entetes = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
            Font cellule = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font montantFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);

            document.add(new Paragraph(entete, titre));
            document.add(new Paragraph(numeroFacture, titre));
            document.add(new Paragraph(tiersPayant, sousTitre));
            document.add(new Paragraph(periode, sousTitre));
            document.add(new Paragraph("Imprimé par : " + imprimePar, sousTitre));
            document.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(COLONNES.length);
            table.setWidthPercentage(100);
            table.setWidths(LARGEURS);
            table.setHeaderRows(1);
            for (int i = 0; i < COLONNES.length; i++) {
                PdfPCell hc = new PdfPCell(new Phrase(COLONNES[i], entetes));
                hc.setGrayFill(0.88f);
                hc.setBorder(Rectangle.NO_BORDER);
                hc.setPadding(2f);
                if (i == COLONNES.length - 1) {
                    hc.setHorizontalAlignment(Element.ALIGN_RIGHT);
                }
                table.addCell(hc);
            }

            List<FactureDetailDTO> lignes = new java.util.ArrayList<>(bons == null ? List.of() : bons);
            lignes.sort(Comparator.comparing(FactureCarnetDepotPdf::cleDeTri));

            long total = 0;
            for (FactureDetailDTO bon : lignes) {
                table.addCell(cellule(nz(bon.getDateVente()), cellule, false));
                table.addCell(cellule(nz(bon.getStrREF()), cellule, false));
                table.addCell(cellule(beneficiaire(bon), cellule, false));
                table.addCell(cellule(matricule(bon), cellule, false));
                long montant = bon.getDblMONTANT() == null ? 0 : bon.getDblMONTANT();
                table.addCell(cellule(montant(montant), montantFont, true));
                total += montant;
            }

            PdfPCell libelle = cellule("TOTAL (" + lignes.size() + " bon(s))", entetes, false);
            libelle.setColspan(COLONNES.length - 1);
            libelle.setGrayFill(0.93f);
            table.addCell(libelle);
            PdfPCell valeur = cellule(montant(total), entetes, true);
            valeur.setGrayFill(0.93f);
            table.addCell(valeur);

            document.add(table);
            document.close();
            return sortie.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Construction du PDF facture carnet depot impossible", e);
            if (document.isOpen()) {
                document.close();
            }
            return new byte[0];
        }
    }

    /**
     * Cle de tri : la date du bon, ramenee a « aaaammjj » pour que l'ordre soit chronologique.
     *
     * <p>
     * Trier sur le texte « jj/mm/aaaa » classerait le 02/01 avant le 15/12 de l'annee precedente : le tri demande est
     * bien celui des dates, pas celui de leur ecriture.
     * </p>
     */
    static String cleDeTri(FactureDetailDTO bon) {
        String date = bon == null ? null : bon.getDateVente();
        if (date == null || date.length() != 10) {
            return "99999999";
        }
        return date.substring(6, 10) + date.substring(3, 5) + date.substring(0, 2);
    }

    /** Le beneficiaire est l'ayant droit quand il y en a un, le client assure sinon. */
    static String beneficiaire(FactureDetailDTO bon) {
        String nom = nz(bon.getAyantDroitFirstName()), prenom = nz(bon.getAyantDroitLastName());
        if (nom.isEmpty() && prenom.isEmpty()) {
            nom = nz(bon.getClientFirstName());
            prenom = nz(bon.getClientLastName());
        }
        return (nom + " " + prenom).trim();
    }

    static String matricule(FactureDetailDTO bon) {
        String matricule = nz(bon.getAyantDroitNumAssurance());
        return matricule.isEmpty() ? nz(bon.getClientNumAssurance()) : matricule;
    }

    public static String montant(long valeur) {
        return String.format("%,d", valeur).replace(',', ' ');
    }

    private static String nz(String valeur) {
        return valeur == null ? "" : valeur.trim();
    }

    private static PdfPCell cellule(String texte, Font police, boolean aDroite) {
        PdfPCell c = new PdfPCell(new Phrase(texte, police));
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(2f);
        if (aDroite) {
            c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        }
        return c;
    }
}
