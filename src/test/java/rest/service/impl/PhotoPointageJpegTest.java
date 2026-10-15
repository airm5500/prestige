package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Photo de controle du pointage (point 31) : dimensions lues dans l'en-tete JPEG, sans decoder l'image. */
class PhotoPointageJpegTest {

    private static byte[] jpeg(int largeur, int hauteur) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(largeur, hauteur, BufferedImage.TYPE_INT_RGB), "jpg", out);
        return out.toByteArray();
    }

    @Test
    @DisplayName("Largeur et hauteur d'un JPEG reel")
    void dimensions() throws Exception {
        assertArrayEquals(new int[] { 640, 480 }, RhPointageServiceImpl.dimensionsJpeg(jpeg(640, 480)));
        assertArrayEquals(new int[] { 1200, 90 }, RhPointageServiceImpl.dimensionsJpeg(jpeg(1200, 90)));
    }

    @Test
    @DisplayName("Fichier tronque ou qui n'est pas un JPEG : illisible")
    void illisible() throws Exception {
        assertNull(RhPointageServiceImpl.dimensionsJpeg(new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF }));
        byte[] png = new byte[64];
        png[0] = (byte) 0x89;
        assertNull(RhPointageServiceImpl.dimensionsJpeg(png));
        byte[] coupe = java.util.Arrays.copyOf(jpeg(64, 64), 12);
        assertNull(RhPointageServiceImpl.dimensionsJpeg(coupe));
    }
}
