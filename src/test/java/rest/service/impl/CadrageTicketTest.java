package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import org.junit.jupiter.api.Test;
import rest.service.ticket.ConversionTicket;
import rest.service.ticket.ExemplesTicket;
import rest.service.ticket.ModeleTicket;
import rest.service.ticket.ReglagesTicket;
import rest.service.ticket.RenduTicket;
import rest.service.ticket.TicketDocument;

/**
 * Retour du 05/11 (ticket blanc) : la page est construite comme a l'impression, papier par defaut de Java (Letter, 612
 * points de large) et zone imprimable a 9 points du bord. Le ticket doit etre dessine sur le rouleau (les 80 premiers
 * millimetres), jamais decale a droite d'apres la largeur de ce papier fictif.
 */
class CadrageTicketTest {

    private static int[] encre(int papierMm, int debut) {
        PageFormat pf = new PageFormat();
        Paper paper = new Paper();
        paper.setImageableArea(9 + debut, -70, paper.getWidth(), paper.getHeight());
        pf.setPaper(paper);
        ReglagesTicket r = new ReglagesTicket(ModeleTicket.VENTE);
        TicketDocument d = ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.VENTE, papierMm), r);
        BufferedImage img = new BufferedImage(700, 1200, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 700, 1200);
        assertTrue(ImpressionServiceImpl.placer(g, pf, 0, papierMm, 2000));
        RenduTicket.dessiner(g, d, r, papierMm, 0, ImpressionServiceImpl.DEPART_NOUVEAU);
        g.dispose();
        int min = Integer.MAX_VALUE, max = -1;
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                if ((img.getRGB(x, y) & 0xff) < 128) {
                    min = Math.min(min, x);
                    max = Math.max(max, x);
                }
            }
        }
        return new int[] { min, max };
    }

    @Test
    void ticket80SurLeRouleau() {
        int[] e = encre(80, 0);
        assertTrue(e[1] > 0, "rien n'est dessine");
        assertTrue(e[0] >= 9 && e[0] < 20, "debut " + e[0]);
        assertTrue(e[1] <= 80 * 72 / 25.4, "le ticket deborde du rouleau de 80 mm : fin a " + e[1] + " pt");
    }

    @Test
    void ticket58SurLeRouleau() {
        int[] e = encre(58, 0);
        assertTrue(e[1] > 0, "rien n'est dessine");
        assertTrue(e[1] <= 58 * 72 / 25.4, "le ticket deborde du rouleau de 58 mm : fin a " + e[1] + " pt");
    }

    @Test
    void debutDeLImprimanteRespecte() {
        int[] e = encre(80, 10);
        assertTrue(e[0] >= 19, "debut " + e[0]);
        assertFalse(e[1] > 80 * 72 / 25.4 + 10, "fin " + e[1]);
    }
}
