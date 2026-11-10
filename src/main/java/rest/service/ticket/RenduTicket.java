package rest.service.ticket;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
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
 * Dessin du nouveau modele de ticket (demande du 02/11). Le meme code sert a l'imprimante et a l'apercu du menu «
 * Modeles de ticket » : ce que l'on voit a l'ecran est ce qui sort.
 *
 * <p>
 * Tout tient dans la largeur imprimable du rouleau (72 mm sur 80 mm, 48 mm sur 58 mm) : les textes trop longs passent a
 * la ligne aux espaces, une designation n'est jamais coupee a 20 caracteres comme dans l'ancien modele. Ce qui ne peut
 * pas tenir (un montant plus large que le rouleau) est note dans les debordements, que le menu refuse d'enregistrer.
 */
public final class RenduTicket {

    public static final double PT_MM = 72 / 25.4;
    /** Police de repli, celle du ticket d'avant le 03/11. */
    static final String POLICE_REPLI = "Arial Narrow";
    private static volatile java.util.Set<String> installees;

    /** Retour du 03/11 : la police choisie dans « Modeles de ticket » si le poste l'a, sinon {@code repli}. */
    static String choisirPolice(String voulue, String repli) {
        java.util.Set<String> polices = installees;
        if (polices == null) {
            polices = new java.util.HashSet<>();
            try {
                for (String f : java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment()
                        .getAvailableFontFamilyNames()) {
                    polices.add(f.toLowerCase(java.util.Locale.ROOT));
                }
            } catch (RuntimeException | Error e) {
                // environnement sans polices : le repli
            }
            installees = polices;
        }
        return voulue != null && polices.contains(voulue.toLowerCase(java.util.Locale.ROOT)) ? voulue : repli;
    }

    /** Ce que le dessin a produit : hauteur, zone de chaque bloc et debordements. */
    public static final class Resultat {
        public int hauteur;
        public final Map<String, int[]> zones = new LinkedHashMap<>();
        public final List<String> debordements = new ArrayList<>();
        /** Plan du 06/11 point 1 : hauteur du code-barres et taille de la police de la date, dessines au pied. */
        public int hauteurCodeBarres;
        public int policeDate;
        /** La date ne tenait pas a cote du code-barres : elle est passee dessous. */
        public boolean dateSousCodeBarres;
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
        l.add(TicketDocument.PIED);
        return l;
    }

    /**
     * Problemes bloquants d'une disposition (bloc inconnu ou en double, pied deplace, alignement ou taille hors bornes)
     * ; les avertissements (ordre inhabituel) vont dans {@code avertissements}.
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
    /** Largeur utile du rouleau, marges deduites. */
    private final double largeurTotale;
    /** Largeur du bloc en cours (retour du 05/11 : un bloc peut etre plus etroit que le rouleau). */
    private double largeur;
    /** Bloc retreci : chaque texte tient sur une ligne, termine par « … ». */
    private boolean uneLigne;
    /** Plan du 09/11, point 15 : nom long du tiers payant sur deux lignes (reglage du modele), sinon sur une ligne. */
    private boolean tpDeuxLignes;
    private final int base;
    private final String police;
    private final Resultat res = new Resultat();
    private int y;
    private ReglagesTicket.Position position;
    /** Plan du 06/11 point 1 : taille propre de la date du pied (reglage du bloc « Date du ticket »). */
    private int tailleDate;

    private RenduTicket(Graphics2D g, double largeur, int base, String police) {
        this.g = g;
        this.largeurTotale = largeur;
        this.largeur = largeur;
        this.base = base;
        this.police = police;
    }

    /** Retour du 05/11 : marge de chaque cote, en points. */
    static double marge(ReglagesTicket r, int papierMm) {
        return Math.max(0, Math.min(ReglagesTicket.MARGE_MAX, r.marge())) * PT_MM;
    }

    /** Dessine le ticket a partir de la hauteur {@code depart} ; rend la hauteur atteinte et les zones des blocs. */
    public static Resultat dessiner(Graphics2D g, TicketDocument doc, ReglagesTicket r, int papierMm, int ajoutPolice,
            int depart) {
        double marge = marge(r, papierMm);
        RenduTicket rendu = new RenduTicket(g, largeurImprimable(papierMm) - 2 * marge,
                tailleBase(papierMm, ajoutPolice), choisirPolice(r.police(), POLICE_REPLI));
        g.setColor(Color.BLACK);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.translate(marge, 0);
        rendu.y = depart;
        ReglagesTicket.Position date = r.position(TicketDocument.DATE);
        rendu.tailleDate = date != null ? date.taille : 0;
        for (String id : ordre(r)) {
            Bloc b = doc.existant(id);
            if (b == null || b.vide()) {
                continue;
            }
            ReglagesTicket.Position p = r.position(id);
            String alignement = p != null && !p.alignement.isEmpty() ? p.alignement : b.alignement;
            int ecart = p != null ? p.taille : 0;
            // retour du 05/11 : bloc retreci, place selon son alignement, chaque texte sur une ligne
            int pourcent = p != null && !TicketDocument.PIED.equals(id) ? p.largeur : 100;
            rendu.largeur = rendu.largeurTotale * pourcent / 100.0;
            rendu.uneLigne = pourcent < 100;
            rendu.tpDeuxLignes = ReglagesTicket.TP_DEUX_LIGNES.equals(r.tiersPayant());
            double x0 = "C".equals(alignement) ? (rendu.largeurTotale - rendu.largeur) / 2
                    : "D".equals(alignement) ? rendu.largeurTotale - rendu.largeur : 0;
            rendu.position = p;
            g.translate(x0, 0);
            int y0 = rendu.y;
            for (Element e : b.elements) {
                // plan du 06/11 point 1 : un texte du pied est une date (« Édité le » du ticket Z) : taille de la date
                boolean datePied = TicketDocument.PIED.equals(id) && e.genre == TicketDocument.Genre.TEXTE;
                rendu.element(e, alignement, datePied ? rendu.tailleDate : ecart);
            }
            g.translate(-x0, 0);
            rendu.res.zones.put(id, new int[] { y0, rendu.y });
            rendu.y += 2;
        }
        g.translate(-marge, 0);
        rendu.largeur = rendu.largeurTotale;
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
            return new Font(police, Font.BOLD, t);
        case PETIT:
            return new Font(police, Font.PLAIN, Math.max(6, t - 1));
        case NOM:
            return new Font(police, Font.BOLD, t + 6);
        case GRAND:
            return new Font(police, Font.BOLD, t + 3);
        case NUMERO:
            return new Font(police, Font.BOLD, t + 12);
        case SECTION:
            return new Font(police, Font.BOLD, Math.max(6, t + (position != null ? position.section : 0)));
        default:
            return new Font(police, Font.PLAIN, t);
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
        case TRAIT_FIN:
            traitFin();
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
        int w = largeurTexte(texte);
        double x = "C".equals(alignement) ? (largeur - w) / 2 : "D".equals(alignement) ? largeur - w : 0;
        y += fm.getAscent();
        dessinerTexte(texte, Math.max(0, x), y);
        y += fm.getDescent() + 1;
        if (w > largeur + 0.5) {
            res.debordements.add(sansMarques(texte));
        }
    }

    /** Libelle a gauche (coupe au besoin), valeur a droite sur la derniere ligne du libelle. */
    private void paire(String gauche, String droite, double l, double decalage) {
        FontMetrics fm = g.getFontMetrics();
        int wd = largeurTexte(droite);
        if (wd > l + 0.5) {
            res.debordements.add(sansMarques(droite));
        }
        double place = Math.max(20, l - wd - 6);
        /* plan du 09/11, point 15 : nom long du tiers payant, taux et montant toujours visibles */
        if (tpDeuxLignes && !uneLigne) {
            String[] deux = organismeDeuxLignes(gauche, place);
            if (deux != null) {
                int haut = y;
                for (int i = 0; i < 2; i++) {
                    y += fm.getAscent();
                    dessinerTexte(deux[i], decalage, y);
                    y += fm.getDescent() + 1;
                }
                int milieu = haut + (y - haut) / 2 + (fm.getAscent() - fm.getDescent()) / 2;
                dessinerTexte(deux[2], decalage + place - largeurTexte(deux[2]), milieu);
                if (!droite.isEmpty()) {
                    dessinerTexte(droite, decalage + l - wd, milieu);
                }
                return;
            }
        }
        String une = organismeUneLigne(gauche, place);
        List<String> lignes = une != null ? java.util.Collections.singletonList(une) : couper(gauche, place);
        for (int i = 0; i < lignes.size(); i++) {
            y += fm.getAscent();
            dessinerTexte(lignes.get(i), decalage, y);
            if (i == lignes.size() - 1 && !droite.isEmpty()) {
                dessinerTexte(droite, decalage + l - wd, y);
            }
            y += fm.getDescent() + 1;
        }
    }

    /* ---------- parties en gras (retour du 03/11) ---------- */

    /** Le texte sans les marques de gras. */
    static String sansMarques(String t) {
        return t == null ? "" : t.replace(String.valueOf(TicketDocument.GRAS_DEBUT), "")
                .replace(String.valueOf(TicketDocument.GRAS_FIN), "");
    }

    /** Largeur d'un texte dans la police courante, ses parties marquees en gras. */
    private int largeurTexte(String t) {
        if (t.indexOf(TicketDocument.GRAS_DEBUT) < 0) {
            return g.getFontMetrics().stringWidth(sansMarques(t));
        }
        Font normale = g.getFont();
        Font grasse = normale.deriveFont(Font.BOLD);
        int w = 0;
        boolean enGras = false;
        StringBuilder morceau = new StringBuilder();
        for (char ch : (t + TicketDocument.GRAS_DEBUT).toCharArray()) {
            if (ch == TicketDocument.GRAS_DEBUT || ch == TicketDocument.GRAS_FIN) {
                w += g.getFontMetrics(enGras ? grasse : normale).stringWidth(morceau.toString());
                morceau.setLength(0);
                enGras = ch == TicketDocument.GRAS_DEBUT;
            } else {
                morceau.append(ch);
            }
        }
        return w;
    }

    /** Dessine un texte a partir de x, ses parties marquees en gras ; la police courante est rendue telle quelle. */
    private void dessinerTexte(String t, double x, int base) {
        if (t.indexOf(TicketDocument.GRAS_DEBUT) < 0) {
            g.drawString(sansMarques(t), (float) x, base);
            return;
        }
        Font normale = g.getFont();
        Font grasse = normale.deriveFont(Font.BOLD);
        double xx = x;
        boolean enGras = false;
        StringBuilder morceau = new StringBuilder();
        for (char ch : (t + TicketDocument.GRAS_DEBUT).toCharArray()) {
            if (ch == TicketDocument.GRAS_DEBUT || ch == TicketDocument.GRAS_FIN) {
                if (morceau.length() > 0) {
                    g.setFont(enGras ? grasse : normale);
                    g.drawString(morceau.toString(), (float) xx, base);
                    xx += g.getFontMetrics().stringWidth(morceau.toString());
                    morceau.setLength(0);
                }
                enGras = ch == TicketDocument.GRAS_DEBUT;
            } else {
                morceau.append(ch);
            }
        }
        g.setFont(normale);
    }

    private void article(Element e, int ecart) {
        // retour du 05/11 : designation et « quantite × prix » de tailles reglables a part
        int nom = position != null ? position.nom : 0;
        int detail = position != null ? position.detail : 0;
        g.setFont(police(Style.GRAS, ecart + nom));
        for (String l : couper(e.a, largeur)) {
            ligne(l, "G");
        }
        ecart += detail;
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

    /** Retour du 05/11 : trait plein et fin, plus leger que celui des totaux. */
    private void traitFin() {
        y += 3;
        Stroke avant = g.getStroke();
        g.setStroke(new BasicStroke(0.6f));
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
        // retour du 05/11 : la taille du pied agrandit ou reduit aussi le code-barres (12 % par point)
        double echelle = Math.max(0.5, 1 + 0.12 * ecart);
        int largeurImage = (int) Math.min(largeur * 0.8, (qr ? 80 : largeur * (largeur < 150 ? 0.52 : 0.58)) * echelle);
        int hauteurImage = (int) Math.round((qr ? largeurImage : 30 * echelle));
        y += 4;
        BufferedImage img = image(e.a);
        if (img != null && !qr) {
            img = sansTexte(img);
        }
        if (img != null) {
            g.drawImage(img, 0, y, largeurImage, hauteurImage, null);
        } else {
            codeFactice(0, y, largeurImage, hauteurImage, qr);
        }
        double x = largeurImage + 6;
        double libre = largeur - x;
        int yt = y;
        Font gras = police(Style.GRAS, ecart - 1);
        // plan du 06/11 point 1 : la date reste a cote du code-barres, mais avec sa propre taille
        Font petit = police(Style.PETIT, tailleDate);
        res.hauteurCodeBarres = hauteurImage;
        res.policeDate = petit.getSize();
        g.setFont(gras);
        FontMetrics fm = g.getFontMetrics();
        for (String l : couper(e.b, libre)) {
            yt += fm.getAscent();
            g.drawString(l, (float) x, yt);
            yt += fm.getDescent() + 1;
        }
        g.setFont(petit);
        fm = g.getFontMetrics();
        List<String> date = couper(e.c, libre);
        // trop grande pour la place a droite (elle serait coupee en morceaux) : la date passe sous le code-barres
        boolean dessous = date.size() > 1 && couper(e.c, largeur).size() < date.size();
        res.dateSousCodeBarres = dessous;
        if (!dessous) {
            for (String l : date) {
                yt += fm.getAscent();
                g.drawString(l, (float) x, yt);
                yt += fm.getDescent() + 1;
            }
        }
        y = Math.max(y + hauteurImage, yt) + 2;
        if (dessous) {
            for (String l : couper(e.c, largeur)) {
                y += fm.getAscent();
                g.drawString(l, 0, y);
                y += fm.getDescent() + 1;
            }
        }
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

    /**
     * Retour du 03/11 : le code-barres des tickets porte son numero imprime sous les barres, alors que le numero est
     * deja en haut du ticket. On garde les barres seules : la plus longue suite de rangees identiques a la premiere
     * rangee sombre (les barres sont verticales). Une image qui n'a pas cette forme (QR, logo) est rendue telle quelle.
     */
    static BufferedImage sansTexte(BufferedImage img) {
        int w = img.getWidth();
        int h = img.getHeight();
        int haut = -1;
        for (int yy = 0; yy < h && haut < 0; yy++) {
            if (sombre(img, yy)) {
                haut = yy;
            }
        }
        if (haut < 0) {
            return img;
        }
        int bas = haut + 1;
        while (bas < h && memeRangee(img, haut, bas)) {
            bas++;
        }
        boolean dessous = false;
        for (int yy = bas; yy < h && !dessous; yy++) {
            dessous = sombre(img, yy);
        }
        if (!dessous || bas - haut < Math.max(10, h / 3)) {
            return img;
        }
        return img.getSubimage(0, haut, w, bas - haut);
    }

    private static boolean sombre(BufferedImage img, int yy) {
        for (int x = 0; x < img.getWidth(); x++) {
            int p = img.getRGB(x, yy);
            int alpha = p >>> 24;
            int lum = (((p >> 16) & 0xff) + ((p >> 8) & 0xff) + (p & 0xff)) / 3;
            if (alpha > 128 && lum < 128) {
                return true;
            }
        }
        return false;
    }

    private static boolean memeRangee(BufferedImage img, int y1, int y2) {
        for (int x = 0; x < img.getWidth(); x++) {
            if (img.getRGB(x, y1) != img.getRGB(x, y2)) {
                return false;
            }
        }
        return true;
    }

    private static BufferedImage image(String chemin) {
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

    /**
     * Plan du 09/11, point 15 : libelle d'un tiers payant, « NOM [80%] », « NOM [80%] : » ou « NOM 80 % ». Groupe 1 :
     * le nom ; groupe 2 : le taux et ce qui le suit.
     */
    private static final java.util.regex.Pattern ORGANISME = java.util.regex.Pattern
            .compile("^(.*\\S)(\\s*\\[[^\\]]*%[^\\]]*\\]\\s*:?|\\s+\\d+(?:[.,]\\d+)?\\s*%\\s*:?)$");

    /**
     * Plan du 09/11, point 15 : un libelle de tiers payant trop large pour {@code l} tient sur UNE ligne : le nom est
     * raccourci par « … », le taux reste entier. Null si le libelle tient, n'a pas de taux, ou si meme une lettre et le
     * taux ne tiennent pas (la coupure ordinaire s'applique alors).
     */
    String organismeUneLigne(String gauche, double l) {
        String t = gauche == null ? "" : gauche.trim().replaceAll("\\s+", " ");
        if (t.isEmpty() || largeurTexte(t) <= l) {
            return null;
        }
        java.util.regex.Matcher m = ORGANISME.matcher(t);
        if (!m.matches()) {
            return null;
        }
        String suffixe = m.group(2);
        double reste = l - largeurTexte(suffixe);
        if (reste <= 0) {
            return null;
        }
        String nom = points(m.group(1), reste);
        return "…".equals(nom) ? null : nom + suffixe;
    }

    /**
     * Plan du 09/11, point 15, presentation « deux lignes » : {nom ligne 1, nom ligne 2, taux} ; le nom occupe deux
     * lignes au plus a gauche (la seconde raccourcie par « … » s'il le faut), le taux est place a droite du nom, centre
     * sur les deux lignes avec le montant. Null si le libelle tient sur une ligne, n'a pas de taux, ou si la place
     * manque.
     */
    String[] organismeDeuxLignes(String gauche, double l) {
        String t = gauche == null ? "" : gauche.trim().replaceAll("\\s+", " ");
        if (t.isEmpty() || largeurTexte(t) <= l) {
            return null;
        }
        java.util.regex.Matcher m = ORGANISME.matcher(t);
        if (!m.matches()) {
            return null;
        }
        String taux = m.group(2).trim();
        double place = l - largeurTexte(taux) - 4;
        if (place < 20) {
            return null;
        }
        List<String> lignes = couper(m.group(1), place);
        if (lignes.isEmpty()) {
            return null;
        }
        if (lignes.size() < 2) {
            return null;
        }
        String l1 = lignes.get(0);
        String l2 = String.join(" ", lignes.subList(1, lignes.size()));
        if (largeurTexte(l2) > place) {
            l2 = points(l2, place);
        }
        return new String[] { l1, l2, taux };
    }

    /** {@link #organismeDeuxLignes} en police Dialog 9 (pour les tests). */
    static String[] organismeDeuxPour(String t, double l) {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        Graphics2D gi = img.createGraphics();
        try {
            gi.setFont(new Font("Dialog", Font.PLAIN, 9));
            return new RenduTicket(gi, l, 9, "Dialog").organismeDeuxLignes(t, l);
        } finally {
            gi.dispose();
        }
    }

    /** {@link #organismeUneLigne} en police Dialog 9 (pour les tests). */
    static String organismePour(String t, double l) {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        Graphics2D gi = img.createGraphics();
        try {
            gi.setFont(new Font("Dialog", Font.PLAIN, 9));
            return new RenduTicket(gi, l, 9, "Dialog").organismeUneLigne(t, l);
        } finally {
            gi.dispose();
        }
    }

    /** Largeur d'un texte (marques de gras comprises) en police Dialog 9 (pour les tests). */
    static int largeurPour(String t) {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        Graphics2D gi = img.createGraphics();
        try {
            gi.setFont(new Font("Dialog", Font.PLAIN, 9));
            return new RenduTicket(gi, 100, 9, "Dialog").largeurTexte(t);
        } finally {
            gi.dispose();
        }
    }

    /** {@link #points} en police Dialog 9 (pour les tests). */
    static String pointsPour(String t, double l) {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        Graphics2D gi = img.createGraphics();
        try {
            gi.setFont(new Font("Dialog", Font.PLAIN, 9));
            return new RenduTicket(gi, l, 9, "Dialog").points(t, l);
        } finally {
            gi.dispose();
        }
    }

    /**
     * Retour du 05/11 : le texte raccourci pour tenir dans {@code l}, termine par « … » (le gras ouvert est referme).
     */
    String points(String t, double l) {
        int k = t.length();
        String essai = t;
        while (k > 0) {
            essai = t.substring(0, k).trim();
            int debut = essai.lastIndexOf(TicketDocument.GRAS_DEBUT);
            if (debut >= 0 && essai.indexOf(TicketDocument.GRAS_FIN, debut) < 0) {
                essai += TicketDocument.GRAS_FIN;
            }
            essai += "…";
            if (largeurTexte(essai) <= l) {
                return essai;
            }
            k--;
        }
        return "…";
    }

    /**
     * Coupe un texte aux espaces pour la largeur donnee ; un mot plus large est coupe lui-meme. Une partie en gras
     * coupee en deux reste en gras sur les deux lignes.
     */
    List<String> couper(String texte, double l) {
        List<String> lignes = new ArrayList<>();
        String t = texte == null ? "" : texte.trim().replaceAll("\\s+", " ");
        if (t.isEmpty() || largeurTexte(t) <= l) {
            lignes.add(t);
            return lignes;
        }
        if (uneLigne) {
            lignes.add(points(t, l));
            return lignes;
        }
        StringBuilder courante = new StringBuilder();
        for (String mot : t.split(" ")) {
            String essai = courante.length() == 0 ? mot : courante + " " + mot;
            if (largeurTexte(essai) <= l) {
                courante.setLength(0);
                courante.append(essai);
                continue;
            }
            if (courante.length() > 0) {
                lignes.add(courante.toString());
                courante.setLength(0);
            }
            String reste = mot;
            while (largeurTexte(reste) > l && reste.length() > 1) {
                int k = reste.length() - 1;
                while (k > 1 && largeurTexte(reste.substring(0, k)) > l) {
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
        boolean enGras = false;
        for (int i = 0; i < lignes.size(); i++) {
            String ligne = (enGras ? String.valueOf(TicketDocument.GRAS_DEBUT) : "") + lignes.get(i);
            int debut = ligne.lastIndexOf(TicketDocument.GRAS_DEBUT);
            enGras = debut >= 0 && ligne.indexOf(TicketDocument.GRAS_FIN, debut) < 0;
            lignes.set(i, enGras ? ligne + TicketDocument.GRAS_FIN : ligne);
        }
        return lignes;
    }
}
