package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Demande 70 (20/11, SUNMI V3) : sur l'image du ticket en 58 mm a 203 dpi, les textes non gras (8 points, Arial Narrow)
 * n'avaient souvent qu'un point d'imprimante d'epaisseur apres passage en noir et blanc : impression pale, tramee.
 * Regles verifiees sur chaque modele : en 58 mm, moins de 15 % des suites noires horizontales des textes font un seul
 * point (seuil 128) ; le dessin ne fait que noircir (aucun point noir de l'ancien dessin ne disparait) ; meme hauteur,
 * aucun point hors de l'image ; le code-barres et le QR (pied) ne changent pas ; 80 mm inchange.
 */
class ImageTraitsEpaisTest {

    private static final int SEUIL = 128;

    /**
     * Le ticket d'exemple du modele, sans le pied (code-barres, QR, date) : il ne reste que les textes et les traits.
     */
    private static TicketDocument sansPied(ModeleTicket t, int mm, ReglagesTicket r) {
        TicketDocument doc = ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r);
        TicketDocument.Bloc pied = doc.existant(TicketDocument.PIED);
        if (pied != null) {
            pied.elements.clear();
        }
        return doc;
    }

    /** {suites d'un seul point, suites} des lignes horizontales de l'image, apres seuil. */
    static int[] suites(BufferedImage img) {
        int un = 0;
        int toutes = 0;
        for (int y = 0; y < img.getHeight(); y++) {
            int n = 0;
            for (int x = 0; x <= img.getWidth(); x++) {
                boolean noir = x < img.getWidth() && (img.getRGB(x, y) & 0xFF) < SEUIL;
                if (noir) {
                    n++;
                } else if (n > 0) {
                    toutes++;
                    un += n == 1 ? 1 : 0;
                    n = 0;
                }
            }
        }
        return new int[] { un, toutes };
    }

    @Test
    @DisplayName("58 mm, 203 dpi : moins de 15 % des traits des textes font un seul point d'imprimante, sur chaque modele")
    void traitsEpais58() {
        List<String> trop = new ArrayList<>();
        for (ModeleTicket t : ModeleTicket.values()) {
            ReglagesTicket r = new ReglagesTicket(t);
            BufferedImage img = RenduTicket.imageImprimante(sansPied(t, 58, r), r, 58, 203);
            int[] s = suites(img);
            double part = s[1] == 0 ? 0 : 100.0 * s[0] / s[1];
            if (part >= 15) {
                trop.add(t + " " + Math.round(part) + " %");
            }
        }
        assertTrue(trop.isEmpty(), "traits d'un seul point : " + trop);
    }

    /** Ancien dessin de l'image (sans doublement), pour comparer. */
    private static BufferedImage ancien(TicketDocument doc, ReglagesTicket r, int mm, int dpi, int l, int h) {
        BufferedImage img = new BufferedImage(l, h, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = img.createGraphics();
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, l, h);
        double e = RenduTicket.echelleImage(mm, dpi);
        g.scale(e, e);
        g.translate(RenduTicket.BORD_IMAGE, 0);
        RenduTicket.dessiner(g, doc, r, mm, 0, RenduTicket.HAUT_IMAGE);
        g.dispose();
        return img;
    }

    @Test
    @DisplayName("58 mm : le dessin ne fait que noircir, meme hauteur ; pied (code-barres, QR) inchange ; 80 mm identique")
    void seulementPlusNoir() {
        int codes = 0;
        for (ModeleTicket t : ModeleTicket.values()) {
            for (int mm : new int[] { 58, 80 }) {
                for (int dpi : new int[] { 203, 180, 300 }) {
                    ReglagesTicket r = new ReglagesTicket(t);
                    TicketDocument doc = ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r);
                    BufferedImage img = RenduTicket.imageImprimante(doc, r, mm, dpi);
                    BufferedImage avant = ancien(doc, r, mm, dpi, img.getWidth(), img.getHeight());
                    String c = t + " " + mm + " mm " + dpi + " dpi";
                    int pied0 = (int) Math.floor(zonePied(doc, r, mm)[0] * RenduTicket.echelleImage(mm, dpi));
                    int perdus = 0;
                    int ajoutes = 0;
                    int piedChange = 0;
                    for (int y = 0; y < img.getHeight(); y++) {
                        for (int x = 0; x < img.getWidth(); x++) {
                            int n = img.getRGB(x, y) & 0xFF;
                            int a = avant.getRGB(x, y) & 0xFF;
                            perdus += a < SEUIL && n >= SEUIL ? 1 : 0;
                            ajoutes += n != a ? 1 : 0;
                            piedChange += n != a && y >= pied0 && x < img.getWidth() / 2 ? 1 : 0;
                        }
                    }
                    assertEquals(0, perdus, c + " : points noirs perdus");
                    if (mm == 80) {
                        assertEquals(0, ajoutes, c + " : 80 mm doit rester identique");
                    }
                    TicketDocument.Bloc pied = doc.existant(TicketDocument.PIED);
                    boolean code = pied != null
                            && pied.elements.stream().anyMatch(x -> x.genre == TicketDocument.Genre.PIED);
                    if (code) {
                        codes++;
                        assertEquals(0, piedChange, c + " : code-barres ou QR modifie");
                    }
                }
            }
        }
        assertTrue(codes >= 12, "tickets avec code-barres ou QR controles : " + codes);
    }

    private static int[] zonePied(TicketDocument doc, ReglagesTicket r, int mm) {
        BufferedImage essai = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = essai.createGraphics();
        RenduTicket.Resultat res = RenduTicket.dessiner(g, doc, r, mm, 0, RenduTicket.HAUT_IMAGE);
        g.dispose();
        int[] z = res.zones.get(TicketDocument.PIED);
        return z != null ? z : new int[] { res.hauteur, res.hauteur };
    }
}
