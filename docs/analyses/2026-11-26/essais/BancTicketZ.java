package rest.service.impl;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.awt.print.Printable;
import java.io.File;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import javax.imageio.ImageIO;
import rest.service.ticket.ModeleTicket;
import rest.service.ticket.ReglagesTicket;

/** Banc : ticket Z de N caissiers, decoupage en pages du nouveau modele et travaux de l'ancien. */
public class BancTicketZ {

    static final String L1 = "; F CFA;;0;1", L2 = ";F CFA;;1;1", PIED = "; F CFA;;1;1;G";

    static LinkedList<String> corps(int caissiers, int lignes) {
        String[] lib = { "Espèce(vno/vo):", "Crédit(vno/vo):", "Espèce Entrée:", "Espèce Regl:", "Espèce Sortie:",
                "Différé:", "OM (vno/vo):", "WAVE (vno/vo):", "MTN (vno/vo):", "MOOV (vno/vo):" };
        LinkedList<String> l = new LinkedList<>();
        for (int c = 1; c <= caissiers; c++) {
            l.add("RECAPITULATIF DE CAISSE: C.CAISSIER" + String.format("%02d", c) + " ; ; ; ;1;0");
            l.add(" ; ".repeat(6));
            for (int k = 0; k < lignes - 4; k++) {
                l.add(lib[k % lib.length] + ";" + (100000 + c * 1000 + k) + L1);
            }
            l.add("Total espèce: ;" + (900000 + c) + L2);
            l.add(" ; ".repeat(6));
        }
        return l;
    }

    static LinkedList<String> pied() {
        LinkedList<String> l = new LinkedList<>();
        for (String t : new String[] { "TOTAL ESP", "TOTAL OM", "TOTAL WAVE", "TOTAL MTN", "TOTAL (VNO/VO)" }) {
            l.add(t + ": ; 9 999 999" + PIED);
        }
        return l;
    }

    public static void main(String[] a) throws Exception {
        int caissiers = Integer.parseInt(a[0]);
        int lignes = Integer.parseInt(a[1]);
        int papier = Integer.parseInt(a[2]);
        String sortie = a[3];
        LinkedList<String> corps = corps(caissiers, lignes), pied = pied();
        System.out.println("caissiers=" + caissiers + " lignes/caissier=" + lignes + " corps=" + corps.size()
                + " pied=" + pied.size() + " papier=" + papier + " mm");

        /* nouveau modele : un seul travail, pages demandees jusqu'a NO_SUCH_PAGE */
        ImpressionServiceImpl imp = new ImpressionServiceImpl();
        LinkedList<String> tout = new LinkedList<>(corps);
        tout.addAll(pied);
        imp.setDatas(tout);
        imp.setTicketZdatas(tout);
        imp.setTitle("TICKET Z DU 26/11/2026");
        imp.setOperation(new Date());
        imp.setSubtotal(new ArrayList<>());
        imp.setInfoSellers(new ArrayList<>());
        imp.setInfoTiersPayants(new ArrayList<>());
        imp.setCommentaires(new ArrayList<>());
        imp.setShowCodeBar(false);
        imp.modeleNouveau(ModeleTicket.TICKET_Z, papier, new ReglagesTicket(ModeleTicket.TICKET_Z));
        System.out.println("nouveau modele actif : " + imp.nouveauModele());

        PageFormat pf = new PageFormat();
        Paper p = new Paper();
        double hautPage = a.length > 4 ? Double.parseDouble(a[4]) : p.getHeight();
        p.setSize(p.getWidth(), hautPage);
        p.setImageableArea(9, 0, p.getWidth() - 9, hautPage);
        pf.setPaper(p);
        int W = 260, H = (int) Math.ceil(hautPage);
        List<BufferedImage> pages = new ArrayList<>();
        for (int i = 0; i < 60; i++) {
            BufferedImage img = new BufferedImage(W * 2, H * 2, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = img.createGraphics();
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, W * 2, H * 2);
            g.setColor(Color.BLACK);
            g.scale(2, 2);
            int r = imp.print(g, pf, i);
            g.dispose();
            if (r == Printable.NO_SUCH_PAGE) {
                break;
            }
            pages.add(img);
        }
        System.out.println("pages du travail unique : " + pages.size() + " (page de " + H + " points)");
        int caissiersVus = 0;
        for (int i = 0; i < pages.size(); i++) {
            BufferedImage img = pages.get(i);
            int premier = -1, dernier = -1, bandes = 0;
            boolean dans = false;
            for (int y = 0; y < img.getHeight(); y++) {
                boolean encre = false;
                for (int x = 0; x < img.getWidth() && !encre; x++) {
                    encre = (img.getRGB(x, y) & 0xFF) < 128;
                }
                if (encre) {
                    if (premier < 0) {
                        premier = y;
                    }
                    dernier = y;
                    if (!dans) {
                        bandes++;
                    }
                }
                dans = encre;
            }
            boolean coupeBas = dernier >= img.getHeight() - 2;
            boolean coupeHaut = premier >= 0 && premier <= 1;
            System.out.println("  page " + (i + 1) + " : encre de " + premier / 2 + " a " + dernier / 2 + " pt, " + bandes
                    + " lignes d'encre" + (coupeBas ? ", LIGNE COUPEE EN BAS DE PAGE" : "")
                    + (coupeHaut ? ", suite d'une ligne coupee en haut" : ""));
            ImageIO.write(img, "png", new File(sortie, "z-" + caissiers + "x" + lignes + "-" + papier + "mm-page" + (i + 1) + ".png"));
        }

        /* ancien modele : memes boucles que GenerateTicketServiceImpl.printTicketZ, sans imprimer */
        for (int breaking : new int[] { 40 }) {
            System.out.println("ancien modele, BREAKING_TICKET_Z=" + breaking + " :");
            int bodySize = corps.size(), size = bodySize + pied.size();
            if (size <= breaking) {
                System.out.println("  1 travail : lignes 1 a " + size);
                continue;
            }
            int counter = breaking, k = 0, begin = 0;
            int page = (int) (Math.ceil(Double.valueOf(bodySize) / counter));
            try {
                while (k < page) {
                    if (bodySize <= counter) {
                        System.out.println("  travail " + (k + 1) + " : TOUT le corps, lignes 1 a " + bodySize);
                    } else {
                        int rest = bodySize - begin;
                        List<String> sl;
                        if (rest < bodySize) {
                            sl = corps.subList(begin, counter);
                            System.out.println("  travail " + (k + 1) + " : lignes " + (begin + 1) + " a " + counter + " (" + sl.size() + ")");
                        } else if (rest == bodySize) {
                            sl = corps.subList(begin, rest - 1);
                            System.out.println("  travail " + (k + 1) + " : lignes " + (begin + 1) + " a " + (rest - 1) + " (" + sl.size() + ")");
                        } else {
                            sl = corps.subList(begin, bodySize - 1);
                        }
                    }
                    k++;
                    begin += breaking;
                    counter += breaking;
                }
                System.out.println("  dernier travail : pied, " + pied.size() + " lignes");
            } catch (RuntimeException e) {
                System.out.println("  ERREUR au travail " + (k + 1) + " : " + e);
            }
        }
    }
}
