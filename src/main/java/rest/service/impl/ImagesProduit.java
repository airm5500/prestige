package rest.service.impl;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Locale;
import javax.imageio.ImageIO;

/**
 * IMAGES PRODUIT (plan d'octobre, section 6) : les regles, sans base ni disque, pour pouvoir les verifier une a une.
 *
 * <ul>
 * <li>Types : JPG, PNG, WEBP, reconnus par leur SIGNATURE (les premiers octets), pas par le nom ni par le type annonce
 * par le navigateur.</li>
 * <li>Taille : 5 Mo au plus, controlee PENDANT la lecture ({@link #lireBorne}) : un fichier trop gros n'est jamais
 * ecrit, meme partiellement.</li>
 * <li>Disque : {@code images-produits/AAAA/MM/<id>.<ext>} sous la racine de stockage ; chemin relatif en base.</li>
 * <li>Vignette : 240 px au plus sur le grand cote, en JPEG, pour des listes rapides.</li>
 * </ul>
 */
public final class ImagesProduit {

    public static final String DOSSIER = "images-produits";
    /** Nom du dossier des images dans le dossier de configuration de l'officine (retours du 06/10). */
    public static final String DOSSIER_CONF = "images_produits";

    /**
     * Dossier de configuration de l'officine deduit du fichier de configuration lu au demarrage
     * ({@code D:\\CONF\\LABOREX\\CONF\\config_laborex_v1.xml} -> {@code D:\\CONF\\LABOREX}) ; null si inconnu.
     */
    public static java.nio.file.Path dossierConfiguration(String fichierConfig) {
        if (fichierConfig == null || fichierConfig.trim().isEmpty()) {
            return null;
        }
        java.nio.file.Path f = java.nio.file.Paths.get(fichierConfig.trim());
        if (!java.nio.file.Files.isRegularFile(f) || f.getParent() == null || f.getParent().getParent() == null) {
            return null;
        }
        return f.getParent().getParent();
    }

    public static final long TAILLE_MAX = 5L * 1024L * 1024L;
    public static final int COTE_VIGNETTE = 240;

    private ImagesProduit() {
    }

    /** Type reconnu par la signature : jpg, png, webp ; null sinon. */
    public static String typeReel(byte[] d) {
        if (d == null || d.length < 12) {
            return null;
        }
        if ((d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if ((d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') {
            return "png";
        }
        if (d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E' && d[10] == 'B'
                && d[11] == 'P') {
            return "webp";
        }
        return null;
    }

    public static String typeMime(String type) {
        switch (type == null ? "" : type) {
        case "jpg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        default:
            return "application/octet-stream";
        }
    }

    /** Lecture complete du flux, interrompue des que la limite est depassee (rend null dans ce cas). */
    public static byte[] lireBorne(InputStream flux, long max) throws IOException {
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        byte[] tampon = new byte[8192];
        long total = 0;
        int n;
        while ((n = flux.read(tampon)) > 0) {
            total += n;
            if (total > max) {
                return null;
            }
            sortie.write(tampon, 0, n);
        }
        return sortie.toByteArray();
    }

    public static String cheminRelatif(LocalDate jour, String id, String type) {
        return String.format(Locale.ROOT, "%s/%04d/%02d/%s.%s", DOSSIER, jour.getYear(), jour.getMonthValue(), id,
                type);
    }

    /** Chemin lu en base : relatif, dans le dossier des images, sans remontee. */
    public static boolean cheminSur(String relatif) {
        return relatif != null && relatif.startsWith(DOSSIER + "/") && !relatif.contains("..")
                && !relatif.contains("\\") && !relatif.contains(":");
    }

    /** Dimensions et vignette (JPEG). Rend null si l'image ne se decode pas (WEBP : pas de decodeur standard). */
    public static Vignette vignette(byte[] image) {
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(image));
            if (src == null) {
                return null;
            }
            int l = src.getWidth(), h = src.getHeight();
            double r = Math.min(1.0, (double) COTE_VIGNETTE / Math.max(l, h));
            int lv = Math.max(1, (int) Math.round(l * r)), hv = Math.max(1, (int) Math.round(h * r));
            BufferedImage v = new BufferedImage(lv, hv, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = v.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, lv, hv);
            g.drawImage(src, 0, 0, lv, hv, null);
            g.dispose();
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            ImageIO.write(v, "jpg", o);
            return new Vignette(l, h, o.toByteArray());
        } catch (Exception | Error e) {
            return null;
        }
    }

    /** Resultat de {@link #vignette}. */
    public static final class Vignette {

        public final int largeur, hauteur;
        public final byte[] octets;

        Vignette(int largeur, int hauteur, byte[] octets) {
            this.largeur = largeur;
            this.hauteur = hauteur;
            this.octets = Arrays.copyOf(octets, octets.length);
        }
    }
}
