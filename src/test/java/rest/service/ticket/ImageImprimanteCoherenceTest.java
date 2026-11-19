package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.image.BufferedImage;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Demande 63 (applications mobiles) : image du ticket pour l'imprimante thermique de l'appareil. Regles verifiees sur
 * chaque modele, chaque largeur demandee (57, 58, 80, 100 mm) et des resolutions tirees au hasard (graine fixe) :
 * largeur = largeur imprimable x dpi / 25,4 arrondie au point superieur (203 dpi : 384 en 58 mm, 576 en 80 mm) ; 57 ->
 * 58 et 100 -> 80 ; fond blanc ; du texte noir ; rien de coupe (le meme dessin sur une image plus grande ne deborde ni
 * a droite ni en bas) ; hauteur qui suit la resolution.
 */
class ImageImprimanteCoherenceTest {

    private static boolean noir(BufferedImage img, int x, int y) {
        return (img.getRGB(x, y) & 0xFF) < 128;
    }

    @Test
    void largeursDesImprimantesDuMobile() {
        assertEquals(384, RenduTicket.pointsLargeur(ModeleTicketService.largeurValide(58), 203));
        assertEquals(384, RenduTicket.pointsLargeur(ModeleTicketService.largeurValide(57), 203));
        assertEquals(576, RenduTicket.pointsLargeur(ModeleTicketService.largeurValide(80), 203));
        assertEquals(576, RenduTicket.pointsLargeur(ModeleTicketService.largeurValide(100), 203));
    }

    @Test
    void reglesSurChaqueModeleEtDesResolutionsAuHasard() {
        Random r = new Random(20261119L);
        int cas = 0;
        for (ModeleTicket t : ModeleTicket.values()) {
            for (int demande : new int[] { 57, 58, 80, 100 }) {
                int mm = ModeleTicketService.largeurValide(demande);
                ReglagesTicket reglages = new ReglagesTicket(t);
                TicketDocument doc = ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), reglages);
                int[] dpis = { 203, 150 + r.nextInt(250) };
                int[] hauteurs = new int[2];
                for (int k = 0; k < 2; k++) {
                    int dpi = dpis[k];
                    BufferedImage img = RenduTicket.imageImprimante(doc, reglages, mm, dpi);
                    String c = t + " " + demande + " mm " + dpi + " dpi";
                    int attendu = (int) Math.ceil((mm <= 58 ? 48 : 72) * dpi / 25.4 - 1e-6);
                    assertEquals(attendu, img.getWidth(), c);
                    if (dpi == 203) {
                        assertEquals(mm == 58 ? 384 : 576, img.getWidth(), c);
                    }
                    assertTrue(!noir(img, 0, 0) && !noir(img, img.getWidth() - 1, 0), c + " : fond blanc");
                    int noirs = 0;
                    for (int y = 0; y < img.getHeight(); y++) {
                        for (int x = 0; x < img.getWidth(); x += 2) {
                            noirs += noir(img, x, y) ? 1 : 0;
                        }
                    }
                    // rien de coupe : le meme dessin, pose au milieu d'une image plus grande, n'a aucun point hors de
                    // l'image (ni a gauche, ni a droite, ni en bas)
                    final int cote = 40;
                    BufferedImage large = new BufferedImage(img.getWidth() + 2 * cote, img.getHeight() + cote,
                            BufferedImage.TYPE_BYTE_GRAY);
                    java.awt.Graphics2D g = large.createGraphics();
                    g.setColor(java.awt.Color.WHITE);
                    g.fillRect(0, 0, large.getWidth(), large.getHeight());
                    g.translate(cote, 0);
                    RenduTicket.dessinerImage(g, doc, reglages, mm, dpi);
                    g.dispose();
                    int dehors = 0;
                    for (int y = 0; y < large.getHeight(); y++) {
                        for (int x = 0; x < large.getWidth(); x++) {
                            boolean hors = x < cote || x >= cote + img.getWidth() || y >= img.getHeight();
                            if (hors && noir(large, x, y)) {
                                if (dehors++ == 0 && System.getProperty("img63") != null) {
                                    System.out.println("HORS " + c + " x=" + (x - cote) + " y=" + y);
                                }
                            }
                        }
                    }
                    assertEquals(0, dehors, c + " : points hors de l'image (coupes a l'impression)");
                    for (int y = img.getHeight(); y < large.getHeight(); y++) {
                        for (int x = 0; x < large.getWidth(); x++) {
                            assertTrue(!noir(large, x, y), c + " : coupe en bas (" + x + ", " + y + ")");
                        }
                    }
                    assertTrue(noirs > 100, c + " : ticket vide");
                    hauteurs[k] = img.getHeight();
                    cas++;
                }
                // la coupure des lignes depend un peu de la resolution : la hauteur suit le sens de la resolution
                assertEquals(Integer.signum(dpis[1] - 203), Integer.signum(hauteurs[1] - hauteurs[0]),
                        t + " " + demande + " : hauteur selon la resolution");
            }
        }
        assertTrue(cas >= 8 * ModeleTicket.values().length, "cas : " + cas);
    }
}
