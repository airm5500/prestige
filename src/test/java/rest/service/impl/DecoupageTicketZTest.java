package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TEmplacement;
import dal.TImprimante;
import dal.TOfficine;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import util.Constant;

/**
 * Analyse du 26/11 : ancien ticket Z de plus de 40 lignes (10 caissiers le meme jour). Le premier travail contenait
 * tout le corps moins sa derniere ligne, et le dernier travail du corps reimprimait tout le corps.
 */
class DecoupageTicketZTest {

    private static List<String> lignes(String prefixe, int n) {
        List<String> l = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            l.add(prefixe + i + ";1; F CFA;;0;1");
        }
        return l;
    }

    private static List<Integer> tailles(List<DecoupageTicketZ.Travail> travaux) {
        List<Integer> t = new ArrayList<>();
        travaux.forEach(x -> t.add(x.lignes.size()));
        return t;
    }

    /** Lignes du corps imprimees, dans l'ordre des travaux, le dernier travail (le total) mis a part. */
    private static List<String> corpsImprime(List<DecoupageTicketZ.Travail> travaux) {
        List<String> l = new ArrayList<>();
        for (int i = 0; i < travaux.size() - 1; i++) {
            l.addAll(travaux.get(i).lignes);
        }
        return l;
    }

    @Test
    void dixCaissiersQuatreVingtsLignes() {
        List<String> corps = lignes("c", 80), pied = lignes("TOTAL", 5);
        List<DecoupageTicketZ.Travail> t = DecoupageTicketZ.decouper(corps, pied, 40);
        assertEquals(List.of(40, 40, 5), tailles(t), "deux travaux de 40 lignes, puis le total");
        assertEquals(corps, corpsImprime(t), "chaque ligne du corps une fois, dans l'ordre");
        assertEquals(pied, t.get(t.size() - 1).lignes);
    }

    @Test
    void treizeCaissiersCentTrenteLignes() {
        List<String> corps = lignes("c", 130), pied = lignes("TOTAL", 5);
        List<DecoupageTicketZ.Travail> t = DecoupageTicketZ.decouper(corps, pied, 40);
        assertEquals(List.of(40, 40, 40, 10, 5), tailles(t));
        assertEquals(corps, corpsImprime(t));
    }

    @Test
    void uneLigneDeTrop() {
        List<String> corps = lignes("c", 81), pied = lignes("TOTAL", 7);
        assertEquals(List.of(40, 40, 1, 7), tailles(DecoupageTicketZ.decouper(corps, pied, 40)));
    }

    /** Inchange : un ticket qui tient dans la limite sort en un seul travail, corps et total ensemble. */
    @Test
    void ticketCourtEnUnSeulTravail() {
        List<String> corps = lignes("c", 33), pied = lignes("TOTAL", 7);
        List<DecoupageTicketZ.Travail> t = DecoupageTicketZ.decouper(corps, pied, 40);
        assertEquals(1, t.size());
        assertEquals(Constant.TICKET_ZZ, t.get(0).type);
        List<String> tout = new ArrayList<>(corps);
        tout.addAll(pied);
        assertEquals(tout, t.get(0).lignes);
    }

    /** Inchange : le corps tient dans la limite, pas le total avec lui : le corps entier, puis le total. */
    @Test
    void corpsEntierPuisTotal() {
        List<String> corps = lignes("c", 38), pied = lignes("TOTAL", 5);
        List<DecoupageTicketZ.Travail> t = DecoupageTicketZ.decouper(corps, pied, 40);
        assertEquals(List.of(38, 5), tailles(t));
        assertEquals(Constant.TICKET_ZZ, t.get(0).type);
        assertEquals(Constant.TICKET_Z, t.get(1).type);
    }

    @Test
    void toutesLesTaillesToutesLesLimites() {
        for (int limite = 1; limite <= 60; limite++) {
            for (int n = 0; n <= 300; n++) {
                List<String> corps = lignes("c", n), pied = lignes("TOTAL", 6);
                List<DecoupageTicketZ.Travail> t = DecoupageTicketZ.decouper(corps, pied, limite);
                String cas = n + " lignes, limite " + limite;
                if (n + 6 <= limite) {
                    assertEquals(1, t.size(), cas);
                    continue;
                }
                assertEquals(corps, corpsImprime(t), cas + " : corps imprime une fois, dans l'ordre");
                assertEquals(pied, t.get(t.size() - 1).lignes, cas + " : le total en dernier");
                for (int i = 0; i < t.size() - 1; i++) {
                    assertTrue(t.get(i).lignes.size() <= limite && !t.get(i).lignes.isEmpty(), cas + " : travail " + i);
                }
            }
        }
    }

    /** Un parametre nul ou negatif ne bloque pas l'impression : la valeur par defaut (40) s'applique. */
    @Test
    void limiteNulleOuNegative() {
        List<String> corps = lignes("c", 80), pied = lignes("TOTAL", 5);
        assertEquals(List.of(40, 40, 5), tailles(DecoupageTicketZ.decouper(corps, pied, 0)));
        assertEquals(List.of(40, 40, 5), tailles(DecoupageTicketZ.decouper(corps, pied, -3)));
    }

    /** Derniere rangee de pixels encree de l'image, -1 si elle est blanche. */
    private static int basEncre(BufferedImage img) {
        for (int y = img.getHeight() - 1; y >= 0; y--) {
            for (int x = 0; x < img.getWidth(); x++) {
                int rgb = img.getRGB(x, y);
                if (((rgb >> 16) & 0xFF) + ((rgb >> 8) & 0xFF) + (rgb & 0xFF) < 300) {
                    return y;
                }
            }
        }
        return -1;
    }

    /** Dessine un travail de l'ancien ticket Z sur une page de 792 points (celle que le code declare a Java). */
    private static int basDuTravail(DecoupageTicketZ.Travail travail) throws Exception {
        File logo = File.createTempFile("logo", ".png");
        logo.deleteOnExit();
        ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "png", logo);
        toolkits.utils.jdom.scr_report_file_logo = logo.getAbsolutePath();
        TOfficine o = new TOfficine();
        o.setStrNOMCOMPLET("PHARMACIE D'ESSAI");
        o.setStrFIRSTNAME("Dr");
        o.setStrLASTNAME("ESSAI");
        o.setStrPHONE("27 00 00 00");
        o.setStrADRESSSEPOSTALE("Abidjan");
        o.setStrENTETE("NOS REMERCIEMENTS");
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
        imp.setTitle("TICKET Z DU 26/11/2026");
        imp.setOperation(new java.util.Date());
        imp.setSubtotal(new ArrayList<>());
        imp.setInfoSellers(new ArrayList<>());
        imp.setInfoTiersPayants(new ArrayList<>());
        imp.setCommentaires(new ArrayList<>());
        imp.setShowCodeBar(false);
        imp.setTypeTicket(travail.type);
        imp.setDatas(travail.lignes);
        imp.setTicketZdatas(new java.util.LinkedList<>(travail.lignes));
        int largeur = 260, hauteur = 792;
        PageFormat f = new PageFormat();
        Paper papier = new Paper();
        papier.setImageableArea(0, 0, largeur, hauteur);
        f.setPaper(papier);
        /* image plus haute que la page : ce qui deborde de la page se voit */
        BufferedImage page = new BufferedImage(largeur, 2400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = page.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, largeur, 2400);
        g.setColor(Color.BLACK);
        imp.print(g, f, 0);
        g.dispose();
        return basEncre(page);
    }

    /** Chaque travail du ticket Z de 10 caissiers tient sur la page : rien n'est perdu en bas. */
    @Test
    void chaqueTravailTientSurLaPage() throws Exception {
        List<String> corps = new ArrayList<>();
        for (int c = 1; c <= 10; c++) {
            corps.add("RECAPITULATIF DE CAISSE: C.CAISSIER" + c + " ; ; ; ;1;0");
            corps.add(" ; ".repeat(6));
            for (int k = 0; k < 5; k++) {
                corps.add("Espèce(vno/vo):;" + (100000 + k) + "; F CFA;;0;1");
            }
            corps.add(" ; ".repeat(6));
        }
        List<String> pied = new ArrayList<>();
        for (int k = 0; k < 7; k++) {
            pied.add("TOTAL ESP: ; 9 999 999; F CFA;;1;1;G");
        }
        List<DecoupageTicketZ.Travail> travaux = DecoupageTicketZ.decouper(corps, pied, 40);
        assertEquals(List.of(40, 40, 7), tailles(travaux));
        for (DecoupageTicketZ.Travail t : travaux) {
            int bas = basDuTravail(t);
            assertTrue(bas > 150 && bas < 792, "travail de " + t.lignes.size() + " lignes : bas de l'encre a " + bas);
        }
        /* temoin : l'ancien premier travail (79 lignes) depassait la page */
        int basAncien = basDuTravail(new DecoupageTicketZ.Travail(Constant.TICKET_Z, corps.subList(0, 79)));
        assertTrue(basAncien > 792, "79 lignes debordent de la page : " + basAncien);
    }
}
