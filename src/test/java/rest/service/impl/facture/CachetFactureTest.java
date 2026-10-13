package rest.service.impl.facture;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class CachetFactureTest {

    private static byte[] image(String format) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB), format, o);
        return o.toByteArray();
    }

    @Test
    void ciblesAcceptees() {
        assertEquals("COMMUN", CachetFacture.cible(null));
        assertEquals("COMMUN", CachetFacture.cible("commun"));
        assertEquals("MODELE-12", CachetFacture.cible("12"));
        assertEquals("MODELE-12", CachetFacture.cible("MODELE-12"));
        assertNull(CachetFacture.cible("12; DROP"));
    }

    @Test
    void pngEtJpegAcceptesSurLeurContenu() throws Exception {
        byte[] png = image("png"), jpg = image("jpg");
        assertEquals("png", CachetFacture.type(png));
        assertEquals("jpeg", CachetFacture.type(jpg));
        assertArrayEquals(png,
                CachetFacture.decoder("data:image/png;base64," + Base64.getEncoder().encodeToString(png)));
        assertArrayEquals(jpg, CachetFacture.decoder(Base64.getEncoder().encodeToString(jpg)));
    }

    @Test
    void refus() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> CachetFacture.decoder(""));
        assertThrows(IllegalArgumentException.class,
                () -> CachetFacture.decoder(Base64.getEncoder().encodeToString("GIF89a....".getBytes())));
        byte[] faux = new byte[] { (byte) 0x89, 'P', 'N', 'G', 1, 2, 3 };
        assertThrows(IllegalArgumentException.class,
                () -> CachetFacture.decoder(Base64.getEncoder().encodeToString(faux)));
        byte[] lourd = new byte[CachetFacture.TAILLE_MAX + 1];
        lourd[0] = (byte) 0x89;
        lourd[1] = 'P';
        lourd[2] = 'N';
        lourd[3] = 'G';
        assertThrows(IllegalArgumentException.class,
                () -> CachetFacture.decoder(Base64.getEncoder().encodeToString(lourd)));
    }

    @Test
    void largeurBornee() {
        assertEquals(140, CachetFacture.largeur(null));
        assertEquals(40, CachetFacture.largeur(5));
        assertEquals(300, CachetFacture.largeur(900));
    }
}
