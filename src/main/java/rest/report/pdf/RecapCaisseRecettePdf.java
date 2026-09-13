package rest.report.pdf;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
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

import rest.service.dto.StatCaisseRecetteDTO;

/**
 * Edition PDF du recapitulatif caisse / recette (point 16).
 *
 * <p>
 * L'edition passait par l'etat jasper « rp_recap_caisse_recette », qui n'existe ni dans les sources ni sur le serveur :
 * le bouton « imprimer » renvoyait vers un fichier jamais ecrit, donc un 404. Elle est desormais construite en code,
 * comme la liste des bons, ce qui permet en outre de poser les lignes mobile money AU PIED DE CHAQUE JOURNEE, ce qu'un
 * tableau jasper a colonnes fixes ne sait pas faire.
 * </p>
 */
public final class RecapCaisseRecettePdf {

    private static final Logger LOG = Logger.getLogger(RecapCaisseRecettePdf.class.getName());

    /** Colonnes de l'etat ; l'ecart suit le billetage, le solde ferme la ligne. */
    private static final String[] COLONNES = { "Date", "Comptant", "Mobile", "Carte", "Chèque", "Virement", "Crédit",
            "Net", "Clients", "Mouv. caisse", "Regl TP", "Regl DIFF", "Billetage", "Écart", "Solde" };

    private static final float[] LARGEURS = { 9f, 8f, 8f, 7f, 7f, 7f, 7f, 8f, 6f, 8f, 8f, 8f, 8f, 8f, 9f };

    private RecapCaisseRecettePdf() {
    }

    public static byte[] construire(List<StatCaisseRecetteDTO> lignes, String entete, String periode,
            String imprimePar) {
        return construire(lignes, entete, periode, imprimePar, null);
    }

    /**
     * Meme edition, avec le recap « part de chaque mode de reglement dans le CA realise » sous le tableau (retour des
     * tests du 09/09, point 2) : le meme texte qu'au bas de l'ecran.
     */
    public static byte[] construire(List<StatCaisseRecetteDTO> lignes, String entete, String periode, String imprimePar,
            String recapModes) {
        Document document = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, sortie);
            document.open();

            Font titre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font sousTitre = FontFactory.getFont(FontFactory.HELVETICA, 7);
            Font entetes = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
            Font cellule = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font mobile = FontFactory.getFont(FontFactory.HELVETICA, 7, java.awt.Color.DARK_GRAY);
            Font ecartRouge = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new java.awt.Color(192, 57, 43));
            Font ecartVert = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new java.awt.Color(30, 132, 73));

            document.add(new Paragraph(entete, titre));
            document.add(new Paragraph("RECAPITULATIF CAISSE / RECETTE - " + periode, sousTitre));
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
                if (i > 0) {
                    hc.setHorizontalAlignment(Element.ALIGN_RIGHT);
                }
                table.addCell(hc);
            }

            Totaux totaux = new Totaux();
            for (StatCaisseRecetteDTO ligne : lignes) {
                table.addCell(cellule(ligne.getDisplayMvtDate(), cellule, false));
                table.addCell(cellule(montant(ligne.getMontantEspece()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantMobile()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantCb()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantCheque()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantVirement()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantCredit()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantNet()), cellule, true));
                table.addCell(cellule(montant(ligne.getNbreClient()), cellule, true));
                // Retours du 12/09 : les mouvements de caisse (entrees - sorties) en colonne, apres les clients
                table.addCell(cellule(montant(ligne.getMontantMouvements()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantReglementFacture()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantReglementDiff()), cellule, true));
                table.addCell(cellule(montant(ligne.getMontantBilletage()), cellule, true));
                // Ecart : rouge quand le comptant est INFERIEUR au billetage, vert quand il est superieur,
                // tiret quand aucun billetage n'a ete saisi - il n'y a alors rien a comparer.
                if (!ligne.isBilletageSaisi()) {
                    table.addCell(cellule("-", cellule, true));
                } else {
                    long ecart = ligne.getMontantEcart();
                    table.addCell(cellule(montant(ecart), ecart < 0 ? ecartRouge : ecartVert, true));
                }
                table.addCell(cellule(montant(ligne.getMontantSolde()), cellule, true));

                /*
                 * Detail mobile money au pied de la journee, sur UNE ligne : « ORANGE 12 000 - MTN 8 000 ». La somme de
                 * ces parts vaut le montant Mobile de la ligne juste au-dessus, par construction.
                 */
                String detail = detailMobile(ligne.getDetailMobile());
                if (!detail.isEmpty()) {
                    PdfPCell dc = cellule("Mobile money : " + detail, mobile, false);
                    dc.setColspan(COLONNES.length);
                    dc.setPaddingBottom(4f);
                    table.addCell(dc);
                }
                // Retours des tests 4 : les entrees et sorties de caisse, a la suite du mobile money, quand il y en a.
                String mouvements = detailMouvements(ligne.getMontantEntre(), ligne.getMontantSortie());
                if (!mouvements.isEmpty()) {
                    PdfPCell mc = cellule(mouvements, mobile, false);
                    mc.setColspan(COLONNES.length);
                    mc.setPaddingBottom(4f);
                    table.addCell(mc);
                }
                totaux.ajouter(ligne);
            }

            table.addCell(total("TOTAL", entetes, false));
            table.addCell(total(montant(totaux.espece), entetes, true));
            table.addCell(total(montant(totaux.mobile), entetes, true));
            table.addCell(total(montant(totaux.cb), entetes, true));
            table.addCell(total(montant(totaux.cheque), entetes, true));
            table.addCell(total(montant(totaux.virement), entetes, true));
            table.addCell(total(montant(totaux.credit), entetes, true));
            table.addCell(total(montant(totaux.net), entetes, true));
            table.addCell(total(montant(totaux.clients), entetes, true));
            table.addCell(total(montant(totaux.mouvements), entetes, true));
            table.addCell(total(montant(totaux.reglementTp), entetes, true));
            table.addCell(total(montant(totaux.reglementDiff), entetes, true));
            table.addCell(total(montant(totaux.billetage), entetes, true));
            table.addCell(
                    total(totaux.billetage == 0 ? "-" : montant(totaux.espece - totaux.billetage), entetes, true));
            table.addCell(total(montant(totaux.solde), entetes, true));

            document.add(table);
            if (recapModes != null && !recapModes.trim().isEmpty()) {
                document.add(Chunk.NEWLINE);
                document.add(new Paragraph(recapModes, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8)));
            }
            document.close();
            return sortie.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Construction du PDF recapitulatif caisse / recette impossible", e);
            if (document.isOpen()) {
                document.close();
            }
            return new byte[0];
        }
    }

    /** Detail mobile money d'une journee, rendu sur une seule ligne. */
    public static String detailMobile(Map<String, Long> detail) {
        if (detail == null || detail.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        detail.forEach((mode, part) -> {
            if (sb.length() > 0) {
                sb.append("   -   ");
            }
            sb.append(mode).append(" ").append(montant(part));
        });
        return sb.toString();
    }

    /** Entrees et sorties de caisse d'une journee, sur une ligne ; vide quand il n'y en a pas. */
    public static String detailMouvements(long entrees, long sorties) {
        if (entrees == 0 && sorties == 0) {
            return "";
        }
        return "Mouvements de caisse : entrées " + montant(entrees) + "   -   sorties " + montant(sorties);
    }

    public static String montant(long valeur) {
        return String.format("%,d", valeur).replace(',', ' ');
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

    private static PdfPCell total(String texte, Font police, boolean aDroite) {
        PdfPCell c = cellule(texte, police, aDroite);
        c.setGrayFill(0.93f);
        return c;
    }

    /** Cumuls de la periode, additionnes au fil des lignes plutot que dans une seconde boucle. */
    private static final class Totaux {
        private long espece;
        private long mobile;
        private long cb;
        private long cheque;
        private long virement;
        private long credit;
        private long net;
        private long clients;
        private long mouvements;
        private long reglementTp;
        private long reglementDiff;
        private long billetage;
        private long solde;

        void ajouter(StatCaisseRecetteDTO l) {
            mouvements += l.getMontantMouvements();
            espece += l.getMontantEspece();
            mobile += l.getMontantMobile();
            cb += l.getMontantCb();
            cheque += l.getMontantCheque();
            virement += l.getMontantVirement();
            credit += l.getMontantCredit();
            net += l.getMontantNet();
            clients += l.getNbreClient();
            reglementTp += l.getMontantReglementFacture();
            reglementDiff += l.getMontantReglementDiff();
            billetage += l.getMontantBilletage();
            solde += l.getMontantSolde();
        }
    }
}
