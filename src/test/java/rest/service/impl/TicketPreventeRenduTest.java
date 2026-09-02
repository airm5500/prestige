package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.awt.print.Printable;
import java.io.File;
import java.util.Arrays;
import java.util.Collections;

import javax.imageio.ImageIO;

import dal.TEmplacement;
import dal.TImprimante;
import dal.TOfficine;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import util.Constant;
import util.QrCodeImage;

/**
 * Rendu du ticket de prevente par le service d'impression, sans imprimante : on dessine dans une image ce que la
 * routine d'impression dessinerait sur le papier, et on verifie que le QR code y est, carre, et que les lignes de
 * montants sont posees sous l'en-tete. Le banc n'a pas d'imprimante thermique ; c'est ici que le dessin se controle.
 */
class TicketPreventeRenduTest {

    private static final int LARGEUR = 230;
    private static final int HAUTEUR = 520;

    private static BufferedImage dessiner(TicketPrevente ticket, File qr) throws Exception {
        File logo = File.createTempFile("logo", ".png");
        logo.deleteOnExit();
        BufferedImage l = new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB);
        ImageIO.write(l, "png", logo);
        toolkits.utils.jdom.scr_report_file_logo = logo.getAbsolutePath();

        TOfficine officine = new TOfficine();
        officine.setStrNOMCOMPLET("PHARMACIE DE TEST");
        officine.setStrFIRSTNAME("Dr");
        officine.setStrLASTNAME("KONAN");
        officine.setStrPHONE("27 22 44 55 66");
        officine.setStrADRESSSEPOSTALE("Abidjan");
        officine.setStrENTETE("");
        TEmplacement emplacement = new TEmplacement();
        emplacement.setLgEMPLACEMENTID("1");
        TImprimante imprimante = new TImprimante();
        imprimante.setIntBEGIN(0);
        imprimante.setIntCOLUMN1(0);
        imprimante.setIntCOLUMN2(0);
        imprimante.setIntCOLUMN3(0);
        imprimante.setIntCOLUMN4(0);

        ImpressionServiceImpl imp = new ImpressionServiceImpl();
        imp.setOTImprimante(imprimante);
        imp.setOfficine(officine);
        imp.setEmplacement(emplacement);
        imp.setTitle(ticket.titre());
        imp.setTypeTicket(Constant.TICKET_PREVENTE);
        imp.setShowCodeBar(true);
        imp.setOperation(new java.util.Date());
        imp.setIntBegin(0);
        imp.buildTicket(ticket.lignes(), ticket.enTete(), Collections.emptyList(), Collections.emptyList(),
                Collections.emptyList(), qr.getAbsolutePath());

        BufferedImage page = new BufferedImage(LARGEUR, HAUTEUR, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = page.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, LARGEUR, HAUTEUR);
        g.setColor(Color.BLACK);
        PageFormat format = new PageFormat();
        Paper papier = new Paper();
        papier.setImageableArea(0, 0, LARGEUR, HAUTEUR);
        format.setPaper(papier);
        int resultat = imp.print(g, format, 0);
        g.dispose();
        assertEquals(Printable.PAGE_EXISTS, resultat);
        return page;
    }

    private static int pixelsSombres(BufferedImage img, int x0, int y0, int x1, int y1) {
        int n = 0;
        for (int x = Math.max(0, x0); x < Math.min(img.getWidth(), x1); x++) {
            for (int y = Math.max(0, y0); y < Math.min(img.getHeight(), y1); y++) {
                int rgb = img.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF, v = (rgb >> 8) & 0xFF, b = rgb & 0xFF;
                if (r + v + b < 3 * 100) {
                    n++;
                }
            }
        }
        return n;
    }

    @Test
    @DisplayName("Ticket assurance : le QR code est dessine, carre, sous les montants")
    void assuranceAvecQrCode() throws Exception {
        File qr = File.createTempFile("qr-prevente", ".png");
        qr.deleteOnExit();
        QrCodeImage.ecrire("4cc645b0-6309-427d-83f0-1633b08ea17e", qr);
        TicketPrevente ticket = new TicketPrevente("2", "260902_00005", "02/09/2026 07:01", "S.ADMIN", 12_000, 0, 2_400,
                Arrays.asList(new TicketPrevente.Organisme("MUGEFCI", 80, 9_600)));
        BufferedImage page = dessiner(ticket, qr);

        File sortie = new File(System.getProperty("java.io.tmpdir"), "ticket-prevente-assurance.png");
        ImageIO.write(page, "png", sortie);

        // Le ticket commence a 85 points du haut (marge de la routine d'impression) : l'en-tete est entre 85 et 150.
        int hautDeTicket = pixelsSombres(page, 0, 80, LARGEUR, 150);
        assertTrue(hautDeTicket > 50, "l'en-tete de l'officine doit etre dessine, pixels sombres : " + hautDeTicket);
        // Le QR est pose a x=55, cote 120 : on doit y trouver beaucoup de noir, et du blanc aussi (les modules).
        int meilleur = 0;
        for (int y = 150; y < HAUTEUR - 120; y += 4) {
            meilleur = Math.max(meilleur, pixelsSombres(page, 55, y, 175, y + 120));
        }
        assertTrue(meilleur > 2500, "un carre 120x120 avec un QR code doit contenir bien plus de 2500 pixels sombres,"
                + " au mieux trouve : " + meilleur + " (image : " + sortie + ")");
        assertTrue(meilleur < 12000, "et ne doit pas etre un pave noir : " + meilleur);
    }

    @Test
    @DisplayName("Ticket comptant : se dessine sans erreur, avec un contenu sous l'en-tete")
    void comptant() throws Exception {
        File qr = File.createTempFile("qr-prevente", ".png");
        qr.deleteOnExit();
        QrCodeImage.ecrire("7e251730-0054-4076-8875-857e0feac399", qr);
        TicketPrevente ticket = new TicketPrevente("1", "260902_00005", "02/09/2026 07:01", "S.ADMIN", 2_640, 0, 0,
                null);
        BufferedImage page = dessiner(ticket, qr);
        File sortie = new File(System.getProperty("java.io.tmpdir"), "ticket-prevente-comptant.png");
        ImageIO.write(page, "png", sortie);
        assertTrue(pixelsSombres(page, 0, 60, LARGEUR, HAUTEUR) > 500,
                "les lignes et le QR doivent etre dessines sous l'en-tete (image : " + sortie + ")");
    }
}
