package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Image QR code du ticket de prevente : carree, lisible (noir sur blanc), ecrite en PNG. */
class QrCodeImageTest {

    @Test
    @DisplayName("L'image est carree, a la taille annoncee, avec du noir et du blanc")
    void imageCarree() {
        BufferedImage img = QrCodeImage.image("4cc645b0-6309-427d-83f0-1633b08ea17e");
        assertEquals(QrCodeImage.TAILLE, img.getWidth());
        assertEquals(QrCodeImage.TAILLE, img.getHeight());
        int noirs = 0, blancs = 0;
        for (int x = 0; x < img.getWidth(); x += 2) {
            for (int y = 0; y < img.getHeight(); y += 2) {
                int rgb = img.getRGB(x, y) & 0xFFFFFF;
                if (rgb == 0x000000) {
                    noirs++;
                } else if (rgb == 0xFFFFFF) {
                    blancs++;
                }
            }
        }
        assertTrue(noirs > 100, "le code doit contenir des modules noirs, trouves : " + noirs);
        assertTrue(blancs > 100, "et des modules blancs, trouves : " + blancs);
    }

    @Test
    @DisplayName("Deux contenus differents donnent deux images differentes")
    void contenusDifferents() {
        BufferedImage a = QrCodeImage.image("aaaaaaaa-0000-0000-0000-000000000001");
        BufferedImage b = QrCodeImage.image("aaaaaaaa-0000-0000-0000-000000000002");
        int differents = 0;
        for (int x = 0; x < a.getWidth(); x += 3) {
            for (int y = 0; y < a.getHeight(); y += 3) {
                if (a.getRGB(x, y) != b.getRGB(x, y)) {
                    differents++;
                }
            }
        }
        assertTrue(differents > 0, "les deux codes ne peuvent pas etre identiques");
    }

    @Test
    @DisplayName("Le fichier PNG est ecrit et se relit")
    void fichierPng() throws Exception {
        File f = File.createTempFile("qr-prevente", ".png");
        f.deleteOnExit();
        QrCodeImage.ecrire("contenu", f);
        assertTrue(Files.size(f.toPath()) > 0, "le fichier ne doit pas etre vide");
        BufferedImage relu = ImageIO.read(f);
        assertEquals(QrCodeImage.TAILLE, relu.getWidth());
    }

    @Test
    @DisplayName("Un contenu vide ne fait pas echouer la generation")
    void contenuVide() {
        assertEquals(QrCodeImage.TAILLE, QrCodeImage.image(null).getWidth());
    }
}
