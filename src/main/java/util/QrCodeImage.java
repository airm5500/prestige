package util;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import javax.imageio.ImageIO;

import com.itextpdf.text.pdf.BarcodeQRCode;
import com.itextpdf.text.pdf.qrcode.EncodeHintType;
import com.itextpdf.text.pdf.qrcode.ErrorCorrectionLevel;

/**
 * Image QR code, ecrite en PNG pour etre posee sur un ticket.
 *
 * <p>
 * Le generateur est celui d'iText, deja embarque pour les editions PDF : aucune dependance nouvelle. Le niveau de
 * correction M laisse une marge aux imprimantes thermiques dont le trait bave un peu, sans grossir le code.
 */
public final class QrCodeImage {

    /** Taille du code en pixels, cote a cote : assez grand pour un scanner de caisse, assez petit pour un ticket. */
    public static final int TAILLE = 160;

    private QrCodeImage() {
    }

    /** Image carree, fond blanc, du contenu donne. */
    public static BufferedImage image(String contenu) {
        Map<EncodeHintType, Object> options = new HashMap<>();
        options.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        options.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        // Le generateur refuse un contenu vide : on encode un tiret plutot que de faire echouer l'impression.
        String texte = contenu == null || contenu.isEmpty() ? "-" : contenu;
        BarcodeQRCode qr = new BarcodeQRCode(texte, TAILLE, TAILLE, options);
        Image awt = qr.createAwtImage(Color.BLACK, Color.WHITE);
        BufferedImage carre = new BufferedImage(TAILLE, TAILLE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = carre.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, TAILLE, TAILLE);
        g.drawImage(awt, 0, 0, TAILLE, TAILLE, null);
        g.dispose();
        return carre;
    }

    /** Ecrit l'image dans le fichier PNG donne et le rend. */
    public static File ecrire(String contenu, File fichier) throws IOException {
        ImageIO.write(image(contenu), "png", fichier);
        return fichier;
    }
}
