package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

/** Plan d'octobre (6) : regles des images produit. */
public class ImagesProduitTest {

    private static byte[] png(int l, int h) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(l, h, BufferedImage.TYPE_INT_RGB), "png", o);
        return o.toByteArray();
    }

    @Test
    public void typeParLaSignatureSeulement() throws Exception {
        assertEquals("png", ImagesProduit.typeReel(png(10, 10)));
        byte[] jpg = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
        assertEquals("jpg", ImagesProduit.typeReel(jpg));
        assertEquals("webp", ImagesProduit.typeReel("RIFF\0\0\0\0WEBPVP8 ".getBytes("ISO-8859-1")));
        assertNull(ImagesProduit.typeReel("<html><script>alert(1)</script>".getBytes()), "un faux .png est refuse");
        assertNull(ImagesProduit.typeReel("%PDF-1.4 xxxxxxx".getBytes()));
        assertNull(ImagesProduit.typeReel(new byte[3]));
    }

    @Test
    public void tailleControleePendantLaLecture() throws Exception {
        assertEquals(100, ImagesProduit.lireBorne(new ByteArrayInputStream(new byte[100]), 100).length);
        assertNull(ImagesProduit.lireBorne(new ByteArrayInputStream(new byte[101]), 100));
        assertNull(
                ImagesProduit.lireBorne(new ByteArrayInputStream(new byte[6 * 1024 * 1024]), ImagesProduit.TAILLE_MAX));
    }

    @Test
    public void cheminsRelatifsEtSurs() {
        assertEquals("images-produits/2026/10/abc.png",
                ImagesProduit.cheminRelatif(LocalDate.of(2026, 10, 6), "abc", "png"));
        assertTrue(ImagesProduit.cheminSur("images-produits/2026/10/abc.png"));
        assertFalse(ImagesProduit.cheminSur("images-produits/../../etc/passwd"));
        assertFalse(ImagesProduit.cheminSur("ordonnances/2026/10/x.pdf"));
        assertFalse(ImagesProduit.cheminSur("images-produits\\..\\x"));
        assertFalse(ImagesProduit.cheminSur("C:/x"));
    }

    @Test
    public void vignetteBornee() throws Exception {
        ImagesProduit.Vignette v = ImagesProduit.vignette(png(1200, 600));
        assertNotNull(v);
        assertEquals(1200, v.largeur);
        BufferedImage r = ImageIO.read(new ByteArrayInputStream(v.octets));
        assertEquals(240, r.getWidth());
        assertEquals(120, r.getHeight());
        assertEquals(80, ImageIO.read(new ByteArrayInputStream(ImagesProduit.vignette(png(80, 40)).octets)).getWidth(),
                "une petite image n'est pas agrandie");
        assertNull(ImagesProduit.vignette("pas une image".getBytes()));
    }

    @org.junit.jupiter.api.Test
    public void dossierDeConfiguration() throws Exception {
        java.nio.file.Path racine = java.nio.file.Files.createTempDirectory("conf");
        java.nio.file.Path xml = racine.resolve("LABOREX").resolve("CONF").resolve("config_laborex_v1.xml");
        java.nio.file.Files.createDirectories(xml.getParent());
        java.nio.file.Files.write(xml, new byte[0]);
        org.junit.jupiter.api.Assertions.assertEquals(racine.resolve("LABOREX"),
                ImagesProduit.dossierConfiguration(xml.toString()),
                "D:\\CONF\\LABOREX\\CONF\\config.xml -> D:\\CONF\\LABOREX");
        org.junit.jupiter.api.Assertions
                .assertNull(ImagesProduit.dossierConfiguration(racine.resolve("absent.xml").toString()));
        org.junit.jupiter.api.Assertions.assertNull(ImagesProduit.dossierConfiguration(""));
    }
}
