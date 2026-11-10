package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.ticket.ConversionTicket;
import rest.service.ticket.ExemplesTicket;
import rest.service.ticket.ModeleTicket;
import rest.service.ticket.ReglagesTicket;
import rest.service.ticket.RenduTicket;
import rest.service.ticket.TicketDocument;

/**
 * Retour du 10/11 (photo de la Star) : trop de blanc a gauche du ticket. Le reglage « Debut d'impression » des modeles
 * de ticket deplace tout le ticket (negatif : vers la gauche) sans changer sa largeur ; la marge du rouleau, elle,
 * s'ajoute des deux cotes. Le ticket est dessine comme a l'impression (papier Letter de Java, zone a 9 points).
 */
class DebutImpressionTest {

    static final double DROITE_STAR = 204.3;

    /** Encre du ticket imprime : premiere et derniere colonnes noires, en points. */
    private static int[] encre(int papierMm, ReglagesTicket r, double droite) {
        PageFormat pf = new PageFormat();
        Paper paper = new Paper();
        paper.setImageableArea(9, -70, paper.getWidth(), paper.getHeight());
        pf.setPaper(paper);
        TicketDocument d = ConversionTicket.convertir(ExemplesTicket.exemple(r.ticket(), papierMm), r);
        BufferedImage img = new BufferedImage(320, 1400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, img.getWidth(), img.getHeight());
        assertTrue(ImpressionServiceImpl.placer(g, pf, 0, papierMm, 2000, droite, r.debut()));
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

    private static ReglagesTicket reglages(ModeleTicket t, double debut, int marge) {
        return ReglagesTicket.depuis(t, new ReglagesTicket(t).json().put("debut", debut).put("marge", marge));
    }

    @Test
    void debutNegatifRapprocheLeTicketDuBordGauche() {
        int[] sans = encre(80, reglages(ModeleTicket.VENTE, 0, 0), 0);
        int[] gauche = encre(80, reglages(ModeleTicket.VENTE, -3, 0), 0);
        assertEquals(9, sans[0], "depart par defaut inchange");
        assertTrue(gauche[0] <= 1, "−3 mm : le ticket doit partir du bord (9 − 8,5 pt), il part a " + gauche[0]);
        assertEquals(sans[1] - sans[0], gauche[1] - gauche[0], 1, "la largeur du ticket ne change pas");
    }

    @Test
    void debutPositifEloigneLeTicketSansLeRetrecir() {
        int[] sans = encre(58, reglages(ModeleTicket.VENTE, 0, 0), 0);
        int[] droite = encre(58, reglages(ModeleTicket.VENTE, 2, 0), 0);
        assertEquals(sans[0] + 2 * RenduTicket.PT_MM, droite[0], 1, "+2 mm : depart decale de 5,7 pt");
        assertEquals(sans[1] - sans[0], droite[1] - droite[0], 1, "la largeur du ticket ne change pas");
    }

    @Test
    void debutEtMargeSAdditionnent() {
        int[] e = encre(80, reglages(ModeleTicket.VENTE, -2, 1), 0);
        assertEquals(9 - 2 * RenduTicket.PT_MM + RenduTicket.PT_MM, e[0], 1.5,
                "debut −2 mm, marge 1 mm (encre arrondie au pixel)");
    }

    /** Sur la Star, un ticket decale vers la gauche se reduit moins : il finit toujours avant la limite du pilote. */
    @Test
    void starJamaisAuDelaDeLaZoneDuPilote() {
        for (double debut : new double[] { -3, -1.5, 0, 2, 6 }) {
            int[] e = encre(80, reglages(ModeleTicket.VENTE, debut, 0), DROITE_STAR);
            assertTrue(e[1] <= DROITE_STAR, "debut " + debut + " : fin a " + e[1]);
            assertTrue(e[0] >= 0, "debut " + debut + " : depart a " + e[0]);
        }
    }

    /**
     * Coherence a graine fixe : pour 5 000 valeurs tirees au hasard (y compris hors bornes, illisibles, au pas faux),
     * le debut lu = valeur bornee a [−3 ; 6] et arrondie au demi-millimetre ; il survit a l'aller-retour JSON
     * (enregistrement, export) et se reporte sur les autres tickets ; le depart imprime = 9 pt + debut, jamais negatif.
     */
    @Test
    void coherenceSurCinqMilleValeurs() {
        Random alea = new Random(20261110L);
        ModeleTicket[] tickets = ModeleTicket.values();
        for (int i = 0; i < 5000; i++) {
            double brut = i % 50 == 0 ? Double.NaN : (alea.nextDouble() * 14) - 5;
            double attendu = Double.isNaN(brut) ? 0 : Math.round(Math.max(-3, Math.min(6, brut)) * 2) / 2.0;
            ModeleTicket t = tickets[alea.nextInt(tickets.length)];
            ReglagesTicket r = ReglagesTicket.depuis(t, new ReglagesTicket(t).json().put("debut",
                    Double.isNaN(brut) ? (Object) "illisible" : (Object) brut));
            assertEquals(attendu, r.debut(), 1e-9, "valeur " + brut);
            assertEquals(0, r.debut() * 2 % 1, 1e-9, "pas d'un demi-millimetre");
            ReglagesTicket relu = ReglagesTicket.depuis(t, new JSONObject(r.json().toString()));
            assertEquals(r.debut(), relu.debut(), 1e-9, "aller-retour JSON");
            ModeleTicket autre = tickets[alea.nextInt(tickets.length)];
            assertEquals(r.debut(), new ReglagesTicket(autre).avecCommuns(r).debut(), 1e-9, "report sur " + autre);
            Graphics2D g = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB).createGraphics();
            PageFormat pf = new PageFormat();
            Paper paper = new Paper();
            paper.setImageableArea(9, -70, paper.getWidth(), paper.getHeight());
            pf.setPaper(paper);
            ImpressionServiceImpl.placer(g, pf, 0, alea.nextBoolean() ? 80 : 58, 2000, 0, brut);
            double depart = g.getTransform().getTranslateX();
            assertEquals(Math.max(0, 9 + attendu * RenduTicket.PT_MM), depart, 1e-6, "depart pour " + brut);
            assertTrue(depart >= 0, "jamais avant le bord");
            g.dispose();
        }
    }

    /** Reglage absent (enregistre avant le 10/11) : 0, le ticket ne bouge pas. */
    @Test
    void reglageAncienSansDebut() {
        JSONObject ancien = new ReglagesTicket(ModeleTicket.VENTE).json();
        ancien.remove("debut");
        assertEquals(0, ReglagesTicket.depuis(ModeleTicket.VENTE, ancien).debut(), 1e-9);
    }
}
