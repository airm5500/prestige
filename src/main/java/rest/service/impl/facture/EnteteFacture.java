package rest.service.impl.facture;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Image;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.PdfStamper;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;

/**
 * En-tête et pied de page propres à la pharmacie (plan du 14/11, point 2) : deux images (scan du papier à en-tête),
 * stockées en base (t_entete_facture), apposées sur chaque page de la facture APRÈS sa génération. Les modèles Jasper
 * et le modèle dynamique ne sont pas touchés : sans image, la facture sort exactement comme avant.
 *
 * Sur chaque page, la zone de l'en-tête (en haut) et celle du pied (en bas) sont recouvertes d'un rectangle blanc, qui
 * masque l'en-tête ou le pied d'origine, puis l'image y est posée, réduite pour tenir dans la zone sans être déformée,
 * et centrée.
 */
public final class EnteteFacture {

    private static final Logger LOG = Logger.getLogger(EnteteFacture.class.getName());

    public static final String ENTETE = "ENTETE", PIED = "PIED";
    /** Hauteurs en millimètres : bornes et valeurs par défaut. */
    public static final int ENTETE_MIN = 10, ENTETE_MAX = 80, ENTETE_DEFAUT = 35;
    public static final int PIED_MIN = 5, PIED_MAX = 60, PIED_DEFAUT = 20;
    /** Les deux zones ensemble ne prennent jamais plus de la moitié de la hauteur de la page. */
    public static final double PART_MAX_PAGE = 0.5;
    /** Retrait de l'image dans sa zone, en millimètres (bords gauche et droit, haut et bas). */
    public static final double RETRAIT_COTES_MM = 8, RETRAIT_HAUT_BAS_MM = 2;

    private static final double PT_PAR_MM = 72d / 25.4d;

    private EnteteFacture() {
    }

    /** Partie normalisée : ENTETE ou PIED ; null si inconnue. */
    public static String partie(String valeur) {
        if (valeur == null) {
            return null;
        }
        String v = valeur.trim().toUpperCase();
        if (v.equals("ENTETE") || v.equals("EN-TETE") || v.equals("EN-TÊTE")) {
            return ENTETE;
        }
        return v.equals(PIED) ? PIED : null;
    }

    /** Hauteur (mm) bornée pour la partie ; la valeur par défaut si absente. */
    public static int hauteur(String partie, Integer mm) {
        boolean entete = ENTETE.equals(partie);
        if (mm == null) {
            return entete ? ENTETE_DEFAUT : PIED_DEFAUT;
        }
        return entete ? Math.max(ENTETE_MIN, Math.min(ENTETE_MAX, mm)) : Math.max(PIED_MIN, Math.min(PIED_MAX, mm));
    }

    public static double pt(double mm) {
        return mm * PT_PAR_MM;
    }

    /** Une image à poser : son contenu et la hauteur de sa zone (mm). */
    public static final class Partie {
        public final byte[] image;
        public final int hauteurMm;

        public Partie(byte[] image, int hauteurMm) {
            this.image = image;
            this.hauteurMm = hauteurMm;
        }
    }

    /** Images en place ; l'une ou l'autre peut manquer. */
    public static final class Reglage {
        public final Partie entete, pied;

        public Reglage(Partie entete, Partie pied) {
            this.entete = entete;
            this.pied = pied;
        }

        public boolean vide() {
            return entete == null && pied == null;
        }
    }

    /** Rectangle en points (origine en bas à gauche, comme en PDF). */
    public static final class Zone {
        public final double x, y, largeur, hauteur;

        public Zone(double x, double y, double largeur, double hauteur) {
            this.x = x;
            this.y = y;
            this.largeur = largeur;
            this.hauteur = hauteur;
        }

        public double haut() {
            return y + hauteur;
        }

        public double droite() {
            return x + largeur;
        }

        @Override
        public String toString() {
            return String.format(java.util.Locale.ROOT, "[%.2f %.2f %.2f %.2f]", x, y, largeur, hauteur);
        }
    }

    /**
     * Zones de l'en-tête et du pied sur une page {x0, y0, largeur, hauteur} (points). Si les deux hauteurs demandées
     * dépassent ensemble la moitié de la page, elles sont réduites dans la même proportion. Une hauteur à 0 donne une
     * zone nulle (partie absente). Retour : {entete, pied}.
     */
    public static Zone[] zones(double x0, double y0, double largeurPage, double hauteurPage, double enteteMm,
            double piedMm) {
        double he = pt(Math.max(0, enteteMm)), hp = pt(Math.max(0, piedMm));
        double max = hauteurPage * PART_MAX_PAGE;
        if (he + hp > max) {
            double k = max / (he + hp);
            he *= k;
            hp *= k;
        }
        return new Zone[] { new Zone(x0, y0 + hauteurPage - he, largeurPage, he), new Zone(x0, y0, largeurPage, hp) };
    }

    /** Place une image (largeur, hauteur en pixels) dans une zone : réduite sans déformation, centrée, en retrait. */
    public static Zone placer(double largeurImage, double hauteurImage, Zone zone) {
        double rc = Math.min(pt(RETRAIT_COTES_MM), zone.largeur / 4),
                rh = Math.min(pt(RETRAIT_HAUT_BAS_MM), zone.hauteur / 4);
        double lDispo = zone.largeur - 2 * rc, hDispo = zone.hauteur - 2 * rh;
        if (largeurImage <= 0 || hauteurImage <= 0 || lDispo <= 0 || hDispo <= 0) {
            return new Zone(zone.x + zone.largeur / 2, zone.y + zone.hauteur / 2, 0, 0);
        }
        double k = Math.min(lDispo / largeurImage, hDispo / hauteurImage);
        double l = largeurImage * k, h = hauteurImage * k;
        return new Zone(zone.x + (zone.largeur - l) / 2, zone.y + (zone.hauteur - h) / 2, l, h);
    }

    /** Pose les images sur chaque page d'un PDF ; le PDF inchangé si le réglage est vide. */
    public static byte[] apposer(byte[] pdf, Reglage reglage) throws Exception {
        if (pdf == null || reglage == null || reglage.vide()) {
            return pdf;
        }
        PdfReader lecteur = new PdfReader(pdf);
        ByteArrayOutputStream sortie = new ByteArrayOutputStream(pdf.length + 64 * 1024);
        PdfStamper tampon = new PdfStamper(lecteur, sortie);
        try {
            Image ie = reglage.entete != null ? Image.getInstance(reglage.entete.image) : null;
            Image ip = reglage.pied != null ? Image.getInstance(reglage.pied.image) : null;
            for (int i = 1; i <= lecteur.getNumberOfPages(); i++) {
                Rectangle page = lecteur.getPageSizeWithRotation(i);
                Zone[] z = zones(page.getLeft(), page.getBottom(), page.getWidth(), page.getHeight(),
                        ie != null ? reglage.entete.hauteurMm : 0, ip != null ? reglage.pied.hauteurMm : 0);
                PdfContentByte dessus = tampon.getOverContent(i);
                if (ie != null) {
                    poser(dessus, ie, z[0]);
                }
                if (ip != null) {
                    poser(dessus, ip, z[1]);
                }
            }
        } finally {
            tampon.close();
            lecteur.close();
        }
        return sortie.toByteArray();
    }

    private static void poser(PdfContentByte dessus, Image image, Zone zone) throws Exception {
        dessus.saveState();
        dessus.setColorFill(BaseColor.WHITE);
        dessus.rectangle((float) zone.x, (float) zone.y, (float) zone.largeur, (float) zone.hauteur);
        dessus.fill();
        dessus.restoreState();
        Zone r = placer(image.getWidth(), image.getHeight(), zone);
        if (r.largeur > 0 && r.hauteur > 0) {
            Image copie = Image.getInstance(image);
            copie.scaleAbsolute((float) r.largeur, (float) r.hauteur);
            copie.setAbsolutePosition((float) r.x, (float) r.y);
            dessus.addImage(copie);
        }
    }

    /** Réglage enregistré (null si aucune image). */
    @SuppressWarnings("unchecked")
    public static Reglage charger(EntityManager em) {
        List<Object[]> r = em.createNativeQuery("SELECT partie, image, hauteur FROM t_entete_facture").getResultList();
        Partie e = null, p = null;
        for (Object[] o : r) {
            Partie x = new Partie((byte[]) o[1], hauteur(String.valueOf(o[0]), ((Number) o[2]).intValue()));
            if (ENTETE.equals(o[0])) {
                e = x;
            } else if (PIED.equals(o[0])) {
                p = x;
            }
        }
        return e == null && p == null ? null : new Reglage(e, p);
    }

    /**
     * Version tolérante pour les éditions : en cas d'échec (table absente, image illisible), la facture sort telle
     * quelle et l'incident est journalisé. Une facture sans en-tête vaut mieux qu'une facture qui ne sort pas.
     */
    public static byte[] apposerSiRegle(EntityManager em, byte[] pdf) {
        try {
            Reglage r = em == null ? null : charger(em);
            return r == null ? pdf : apposer(pdf, r);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "en-tête de facture non apposé", e);
            return pdf;
        }
    }

    /** Même chose sur un fichier, réécrit en place (par un fichier voisin puis un renommage). */
    public static void apposerSiRegle(EntityManager em, String chemin) {
        try {
            Reglage r = em == null ? null : charger(em);
            if (r == null) {
                return;
            }
            File f = new File(chemin);
            byte[] nouveau = apposer(Files.readAllBytes(f.toPath()), r);
            File tmp = new File(f.getParentFile(), f.getName() + ".entete");
            Files.write(tmp.toPath(), nouveau);
            Files.move(tmp.toPath(), f.toPath(), StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "en-tête de facture non apposé", e);
        }
    }
}
