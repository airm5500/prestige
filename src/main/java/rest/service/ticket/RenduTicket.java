package rest.service.ticket;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.Stroke;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.imageio.ImageIO;
import rest.service.ticket.TicketDocument.Bloc;
import rest.service.ticket.TicketDocument.Element;
import rest.service.ticket.TicketDocument.Style;

/**
 * Dessin du nouveau modele de ticket (demande du 02/11). Le meme code sert a l'imprimante et a l'apercu du menu
 * « Modeles de ticket » : ce que l'on voit a l'ecran est ce qui sort.
 *
 * <p>
 * Tout tient dans la largeur imprimable du rouleau (72 mm sur 80 mm, 48 mm sur 58 mm) : les textes trop longs passent a
 * la ligne aux espaces, une designation n'est jamais coupee a 20 caracteres comme dans l'ancien modele. Ce qui ne peut
 * pas tenir (un montant plus large que le rouleau) est note dans les debordements, que le menu refuse d'enregistrer.
 */
public final class RenduTicket {

    public static final double PT_MM = 72 / 25.4;
    private static final String POLICE = "Arial Narrow";

    /** Ce que le dessin a produit : hauteur, zone de chaque bloc et debordements. */
    public static final class Resultat {
        public int hauteur;
        public final Map<String, int[]> zones = new LinkedHashMap<>();
        public final List<String> debordements = new ArrayList<>();
    }

    public static double largeurImprimable(int papierMm) {
        return (papierMm <= 58 ? 48 : 72) * PT_MM;
    }

    /** Taille de base des textes : 9 points en 80 mm, 8 en 58 mm, plus le reglage de police de l'imprimante. */
    static int tailleBase(int papierMm, int ajoutImprimante) {
        return (papierMm <= 58 ? 8 : 9) + ajoutImprimante;
    }

    /** Blocs dans l'ordre de la disposition enregistree ; ceux qu'elle ne cite pas gardent leur place du modele. */
    public static List<String> ordre(ReglagesTicket r) {
        List<String> l = new ArrayList<>();
        for (ReglagesTicket.Position p : r.disposition()) {
            if (TicketDocument.ORDRE.contains(p.bloc) && !TicketDocument.FIXES.contains(p.bloc)
                    && !l.contains(p.bloc)) {
                l.add(p.bloc);
            }
        }
        for (int i = 0; i < TicketDocument.ORDRE.size(); i++) {
            String id = TicketDocument.ORDRE.get(i);
            if (TicketDocument.FIXES.contains(id) || l.contains(id)) {
                continue;
            }
            int pos = 0;
            for (int k = i - 1; k >= 0; k--) {
                int j = l.indexOf(TicketDocument.ORDRE.get(k));
                if (j >= 0) {
                    pos = j + 1;
                    break;
                }
            }
            l.add(pos, id);
        }
        l.add(0, TicketDocument.ENTETE);
        l.add(TicketDocument.PIED);
        return l;
    }

    /**
     * Problemes bloquants d'une disposition (bloc inconnu ou en double, en-tete ou pied deplaces, alignement ou taille
     * hors bornes) ; les avertissements (ordre inhabituel) vont dans {@code avertissements}.
     */
    public static List<String> controler(ReglagesTicket r, List<String> avertissements) {
        List<String> bloquants = new ArrayList<>();
        Set<String> vus = new HashSet<>();
        List<ReglagesTicket.Position> d = r.disposition();
        for (int i = 0; i < d.size(); i++) {
            ReglagesTicket.Position p = d.get(i);
            if (!TicketDocument.ORDRE.contains(p.bloc)) {
                bloquants.add("Bloc inconnu : « " + p.bloc + " ».");
            } else if (!vus.add(p.bloc)) {
                bloquants.add("Le bloc « " + TicketDocument.libelle(p.bloc) + " » est placé deux fois.");
            }
            if (TicketDocument.ENTETE.equals(p.bloc) && i != 0) {
                bloquants.add("Le nom de l'officine reste en tête du ticket.");
            }
            if (TicketDocument.PIED.equals(p.bloc) && i != d.size() - 1) {
                bloquants.add("Le code-barres reste au pied du ticket.");
            }
            if (!p.alignement.isEmpty() && !"G".equals(p.alignement) && !"C".equals(p.alignement)
                    && !"D".equals(p.alignement)) {
                bloquants.add("Alignement inconnu pour « " + TicketDocument.libelle(p.bloc) + " ».");
            }
            if (Math.abs(p.taille) > ReglagesTicket.ECART_TAILLE_MAX) {
                bloquants.add("Taille hors bornes pour « " + TicketDocument.libelle(p.bloc) + " ».");
            }
        }
        List<String> o = ordre(r);
        if (o.indexOf(TicketDocument.NET) < o.indexOf(TicketDocument.CORPS)) {
            avertissements.add("Le net à payer est placé avant les articles : autorisé, mais inhabituel.");
        }
        if (o.indexOf(TicketDocument.REGLEMENT) < o.indexOf(TicketDocument.NET)) {
            avertissements.add("Le règlement est placé avant le net à payer : autorisé, mais inhabituel.");
        }
        return bloquants;
    }

    private final Graphics2D g;
    private final double largeur;
    private final int base;
    private final Resultat res = new Resultat();
    private int y;

    private RenduTicket(Graphics2D g, double largeur, int base) {
        this.g = g;
        this.largeur = largeur;
        this.base = base;
    }

    /** Dessine le ticket a partir de la hauteur {@code depart} ; rend la hauteur atteinte et les zones des blocs. */
    public static Resultat dessiner(Graphics2D g, TicketDocument doc, ReglagesTicket r, int papierMm,
            int ajoutPolice, int depart) {
        RenduTicket rendu = new RenduTicket(g, largeurImprimable(papierMm), tailleBase(papierMm, ajoutPolice));
        g.setColor(Color.BLACK);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        rendu.y = depart;
        for (String id : ordre(r)) {
            Bloc b = doc.existant(id);
            if (b == null || b.vide()) {
                continue;
            }
            ReglagesTicket.Position p = r.position(id);
            String alignement = p != null && !p.alignement.isEmpty() ? p.alignement : b.alignement;
            int ecart = p != null ? p.taille : 0;
            int y0 = rendu.y;
            for (Element e : b.elements) {
                rendu.element(e, alignement, ecart);
            }
            rendu.res.zones.put(id, new int[] { y0, rendu.y });
            rendu.y += 2;
        }
        rendu.res.hauteur = rendu.y;
        return rendu.res;
    }

    /** Apercu en image (fond blanc), a l'echelle donnee ; {@code sortie} recoit le resultat du dessin. */
    public static BufferedImage apercu(TicketDocument doc, ReglagesTicket r, int papierMm, double echelle,
            Resultat[] sortie) {
        BufferedImage essai = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        Graphics2D ge = essai.createGraphics();
        Resultat mesure = dessiner(ge, doc, r, papierMm, 0, 8);
        ge.dispose();
        int marge = 8;
        int l = (int) Math.ceil((largeurImprimable(papierMm) + 2 * marge) * echelle);
        int h = (int) Math.ceil((mesure.hauteur + 2 * marge) * echelle);
        BufferedImage img = new BufferedImage(l, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D gi = img.createGraphics();
        gi.setColor(Color.WHITE);
        gi.fillRect(0, 0, l, h);
        gi.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        gi.scale(echelle, echelle);
        gi.translate(marge, 0);
        Resultat res = dessiner(gi, doc, r, papierMm, 0, 8);
        gi.dispose();
        if (sortie != null && sortie.length > 0) {
            sortie[0] = res;
        }
        return img;
    }

    private Font police(Style s, int ecart) {
        int t = base + ecart;
        switch (s) {
        case GRAS:
            return new Font(POLICE, Font.BOLD, t);
        case PETIT:
            return new Font(POLICE, Font.PLAIN, Math.max(6, t - 1));
        case NOM:
            return new Font(POLICE, Font.BOLD, t + 6);
        case GRAND:
            return new Font(POLICE, Font.BOLD, t + 3);
        case NUMERO:
            return new Font(POLICE, Font.BOLD, t + 12);
        default:
            return new Font(POLICE, Font.PLAIN, t);
        }
    }

    private void element(Element e, String alignement, int ecart) {
        switch (e.genre) {
        case TEXTE:
            g.setFont(police(e.style, ecart));
            for (String l : couper(e.a, largeur)) {
                ligne(l, alignement);
            }
            break;
        case PAIRE:
            g.setFont(police(e.style, ecart));
            paire(e.a, e.b, largeur, 0);
            break;
        case ARTICLE:
            article(e, ecart);
            break;
        case ENCADRE:
            encadre(e, ecart);
            break;
        case TRAIT:
        case TRAIT_PLEIN:
            trait(e.genre == TicketDocument.Genre.TRAIT_PLEIN);
            break;
        case SIGNATURES:
            signatures(e, ecart);
            break;
        case PIED:
            pied(e, ecart);
            break;
        case TABLE:
            table(e, ecart);
            break;
        default:
            break;
        }
    }

    private void ligne(String texte, String alignement) {
        FontMetrics fm = g.getFontMetrics();
        int w = fm.stringWidth(texte);
        double x = "C".equals(alignement) ? (largeur - w) / 2 : "D".equals(alignement) ? largeur - w : 0;
        y += fm.getAscent();
        g.drawString(texte, (float) Math.max(0, x), y);
        y += fm.getDescent() + 1;
        if (w > largeur + 0.5) {
            res.debordements.add(texte);
        }
    }

    /** Libelle a gauche (coupe au besoin), valeur a droite sur la derniere ligne du libelle. */
    private void paire(String gauche, String droite, double l, double decalage) {
        FontMetrics fm = g.getFontMetrics();
        int wd = fm.stringWidth(droite);
        if (wd > l + 0.5) {
            res.debordements.add(droite);
        }
        List<String> lignes = couper(gauche, Math.max(20, l - wd - 6));
        for (int i = 0; i < lignes.size(); i++) {
            y += fm.getAscent();
            g.drawString(lignes.get(i), (float) decalage, y);
            if (i == lignes.size() - 1 && !droite.isEmpty()) {
                g.drawString(droite, (float) (decalage + l - wd), y);
            }
            y += fm.getDescent() + 1;
        }
    }

    private void article(Element e, int ecart) {
        g.setFont(police(Style.GRAS, ecart));
        for (String l : couper(e.a, largeur)) {
            ligne(l, "G");
        }
        g.setFont(police(Style.NORMAL, ecart));
        FontMetrics fm = g.getFontMetrics();
        Font gras = police(Style.GRAS, ecart);
        int wm = g.getFontMetrics(gras).stringWidth(e.d);
        y += fm.getAscent();
        g.drawString(e.b, 0, y);
        int wq = fm.stringWidth(e.b);
        boolean lotALaLigne = false;
        if (!e.c.isEmpty()) {
            Font petit = police(Style.PETIT, ecart);
            int wl = g.getFontMetrics(petit).stringWidth(e.c);
            double libre = largeur - wq - wm - 12;
            if (wl <= libre) {
                g.setFont(petit);
                g.drawString(e.c, (float) (wq + 6 + (libre - wl) / 2), y);
            } else {
                lotALaLigne = true;
            }
        }
        g.setFont(gras);
        g.drawString(e.d, (float) (largeur - wm), y);
        y += fm.getDescent() + 1;
        if (lotALaLigne) {
            g.setFont(police(Style.PETIT, ecart));
            for (String l : couper(e.c, largeur)) {
                ligne(l, "G");
            }
        }
    }

    private void encadre(Element e, int ecart) {
        g.setFont(police(e.style == Style.NORMAL ? Style.GRAND : e.style, ecart));
        FontMetrics fm = g.getFontMetrics();
        int marge = 3;
        int y0 = y + 2;
        y = y0 + marge;
        paire(e.a, e.b, largeur - 2 * marge, marge);
        y += marge - 1;
        Stroke avant = g.getStroke();
        g.setStroke(new BasicStroke(1.6f));
        g.drawRect(0, y0, (int) Math.floor(largeur) - 1, y - y0);
        g.setStroke(avant);
        y += 3;
        if (fm.stringWidth(e.b) > largeur - 2 * marge) {
            res.debordements.add(e.b);
        }
    }

    private void trait(boolean plein) {
        y += 3;
        Stroke avant = g.getStroke();
        g.setStroke(plein ? new BasicStroke(1.4f)
                : new BasicStroke(0.7f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 1f, new float[] { 2f, 2f }, 0f));
        g.drawLine(0, y, (int) largeur, y);
        g.setStroke(avant);
        y += 3;
    }

    private void signatures(Element e, int ecart) {
        if (e.libelles.isEmpty()) {
            return;
        }
        g.setFont(police(Style.PETIT, ecart));
        FontMetrics fm = g.getFontMetrics();
        y += 24;
        int n = e.libelles.size();
        double pas = largeur / n;
        for (int i = 0; i < n; i++) {
            int x0 = (int) (i * pas + 4);
            int x1 = (int) ((i + 1) * pas - 4);
            g.drawLine(x0, y, x1, y);
            String l = e.libelles.get(i);
            g.drawString(l, (float) (x0 + (x1 - x0 - fm.stringWidth(l)) / 2.0), y + fm.getAscent() + 1);
        }
        y += fm.getHeight() + 3;
    }

    private void pied(Element e, int ecart) {
        boolean qr = "QR".equals(e.d);
        int largeurImage = qr ? 80 : (int) (largeur * (largeur < 150 ? 0.52 : 0.58));
        int hauteurImage = qr ? 80 : 30;
        y += 4;
        Image img = image(e.a);
        if (img != null) {
            g.drawImage(img, 0, y, largeurImage, hauteurImage, null);
        } else {
            codeFactice(0, y, largeurImage, hauteurImage, qr);
        }
        double x = largeurImage + 6;
        double libre = largeur - x;
        int yt = y;
        Font gras = police(Style.GRAS, ecart - 1);
        Font petit = police(Style.PETIT, ecart);
        String[] lignes = { e.b, e.c };
        for (int i = 0; i < lignes.length; i++) {
            Font f = i == 0 ? gras : petit;
            g.setFont(f);
            FontMetrics fm = g.getFontMetrics();
            for (String l : couper(lignes[i], libre)) {
                yt += fm.getAscent();
                g.drawString(l, (float) x, yt);
                yt += fm.getDescent() + 1;
            }
        }
        y = Math.max(y + hauteurImage, yt) + 2;
    }

    private void table(Element e, int ecart) {
        g.setFont(police(e.style, ecart));
        FontMetrics fm = g.getFontMetrics();
        double col = Math.min(62, largeur / 4.2);
        y += fm.getAscent();
        g.drawString(couper(e.a, largeur - 2 * col - 4).get(0), 0, y);
        g.drawString(e.b, (float) (largeur - col - fm.stringWidth(e.b) - 4), y);
        g.drawString(e.c, (float) (largeur - fm.stringWidth(e.c)), y);
        y += fm.getDescent() + 1;
    }

    private static Image image(String chemin) {
        if (chemin == null || chemin.isEmpty()) {
            return null;
        }
        try {
            File f = new File(chemin);
            return f.isFile() ? ImageIO.read(f) : null;
        } catch (Exception ex) {
            return null;
        }
    }

    /** Apercu sans image (exemple du menu) : barres ou damier a la place du code. */
    private void codeFactice(int x, int y0, int l, int h, boolean qr) {
        if (qr) {
            int c = l / 8;
            for (int i = 0; i < 8; i++) {
                for (int j = 0; j < 8; j++) {
                    if ((i * 3 + j * 5 + i * j) % 3 == 0 || (i < 2 && j < 2) || (i > 5 && j < 2) || (i < 2 && j > 5)) {
                        g.fillRect(x + i * c, y0 + j * c, c, c);
                    }
                }
            }
            return;
        }
        int xx = x;
        int k = 0;
        while (xx < x + l) {
            int w = 1 + (k * 7 % 3);
            g.fillRect(xx, y0, w, h);
            xx += w + 1 + (k * 5 % 2);
            k++;
        }
    }

    /** Coupe un texte aux espaces pour la largeur donnee ; un mot plus large est coupe lui-meme. */
    List<String> couper(String texte, double l) {
        List<String> lignes = new ArrayList<>();
        String t = texte == null ? "" : texte.trim().replaceAll("\\s+", " ");
        FontMetrics fm = g.getFontMetrics();
        if (t.isEmpty() || fm.stringWidth(t) <= l) {
            lignes.add(t);
            return lignes;
        }
        StringBuilder courante = new StringBuilder();
        for (String mot : t.split(" ")) {
            String essai = courante.length() == 0 ? mot : courante + " " + mot;
            if (fm.stringWidth(essai) <= l) {
                courante.setLength(0);
                courante.append(essai);
                continue;
            }
            if (courante.length() > 0) {
                lignes.add(courante.toString());
                courante.setLength(0);
            }
            String reste = mot;
            while (fm.stringWidth(reste) > l && reste.length() > 1) {
                int k = reste.length() - 1;
                while (k > 1 && fm.stringWidth(reste.substring(0, k)) > l) {
                    k--;
                }
                lignes.add(reste.substring(0, k));
                reste = reste.substring(k);
            }
            courante.append(reste);
        }
        if (courante.length() > 0) {
            lignes.add(courante.toString());
        }
        return lignes;
    }
}
