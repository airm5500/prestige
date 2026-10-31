package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.io.File;
import java.util.Collections;
import java.util.List;

import javax.imageio.ImageIO;

import dal.TEmplacement;
import dal.TImprimante;
import dal.TOfficine;
import org.junit.jupiter.api.Test;
import util.Constant;

/**
 * Retour du 31/10 (point 7) : un nom d'officine trop long pour le rouleau passe sur deux lignes centrees ; un nom qui
 * tient reste sur une ligne, a gauche, comme avant.
 */
class TicketNomOfficineTest {

    private static final double ROULEAU = ImpressionServiceImpl.LARGEUR_ROULEAU_80;

    private static FontMetrics mesure() {
        Graphics2D g = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB).createGraphics();
        g.setFont(new Font("Calibri (Corps)", Font.PLAIN, 15));
        return g.getFontMetrics();
    }

    @Test
    void nomCourtSurUneLigne() {
        assertEquals(Collections.singletonList("PHCIE MARY"),
                ImpressionServiceImpl.lignesNomOfficine("PHCIE MARY", mesure(), ROULEAU));
    }

    @Test
    void nomLongCoupeAuxEspacesSansDepasser() {
        FontMetrics fm = mesure();
        String nom = "PHARMACIE MARY DU QUATRIEME PONT DE LA RIVIERA PALMERAIE";
        List<String> l = ImpressionServiceImpl.lignesNomOfficine(nom, fm, ROULEAU);
        assertTrue(l.size() >= 2, l.toString());
        assertEquals(nom, String.join(" ", l), "aucun mot perdu");
        for (String x : l) {
            assertTrue(fm.stringWidth(x) <= ROULEAU, x + " depasse le rouleau");
        }
        List<String> mot = ImpressionServiceImpl.lignesNomOfficine("PHARMACIEDUQUATRIEMEPONTDELARIVIERAPALMERAIE", fm,
                ROULEAU);
        assertTrue(mot.size() >= 2 && mot.stream().allMatch(x -> fm.stringWidth(x) <= ROULEAU), mot.toString());
    }

    /** Ticket dessine dans une image : les deux lignes du nom sont centrees (marges gauche et droite proches). */
    @Test
    void nomLongCentreSurLeTicket() throws Exception {
        File logo = File.createTempFile("logo", ".png");
        logo.deleteOnExit();
        ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "png", logo);
        toolkits.utils.jdom.scr_report_file_logo = logo.getAbsolutePath();
        TOfficine o = new TOfficine();
        o.setStrNOMCOMPLET("PHARMACIE MARY DU QUATRIEME PONT DE LA RIVIERA");
        o.setStrFIRSTNAME("Dr");
        o.setStrLASTNAME("ESSAI");
        o.setStrPHONE("27 00 00 00");
        o.setStrADRESSSEPOSTALE("Abidjan");
        o.setStrENTETE("");
        TEmplacement e = new TEmplacement();
        e.setLgEMPLACEMENTID("1");
        TImprimante i = new TImprimante();
        i.setIntBEGIN(0);
        i.setIntCOLUMN1(0);
        i.setIntCOLUMN2(0);
        i.setIntCOLUMN3(0);
        i.setIntCOLUMN4(0);
        ImpressionServiceImpl imp = new ImpressionServiceImpl();
        imp.setOTImprimante(i);
        imp.setOfficine(o);
        imp.setEmplacement(e);
        imp.setTitle("TICKET");
        imp.setTypeTicket(Constant.TICKET_PREVENTE);
        imp.setOperation(new java.util.Date());
        imp.setIntBegin(1);
        imp.buildTicket(Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
                Collections.emptyList(), Collections.emptyList(), null);
        int largeur = (int) ROULEAU;
        PageFormat f = new PageFormat();
        Paper papier = new Paper();
        papier.setImageableArea(0, 0, largeur, 400);
        f.setPaper(papier);
        BufferedImage page = new BufferedImage(largeur, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = page.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, largeur, 400);
        g.setColor(Color.BLACK);
        imp.print(g, f, 0);
        g.dispose();
        /* premiere ligne du nom : bande au-dessus de la ligne de base 85 */
        int[] bornes = encre(page, 70, 86);
        assertTrue(bornes[0] >= 0, "nom dessine");
        int gauche = bornes[0], droite = largeur - 1 - bornes[1];
        assertTrue(gauche > 3 && Math.abs(gauche - droite) <= 6,
                "premiere ligne centree : marges " + gauche + " / " + droite);
    }

    private static int[] encre(BufferedImage img, int y0, int y1) {
        int min = -1, max = -1;
        for (int x = 0; x < img.getWidth(); x++) {
            for (int y = y0; y < y1; y++) {
                int rgb = img.getRGB(x, y);
                if (((rgb >> 16) & 0xFF) + ((rgb >> 8) & 0xFF) + (rgb & 0xFF) < 300) {
                    min = min < 0 ? x : min;
                    max = x;
                }
            }
        }
        return new int[] { min, max };
    }
}
