package rest.service.impl.facture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.awt.geom.Rectangle2D;
import com.itextpdf.text.Document;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.PdfWriter;
import com.itextpdf.text.pdf.parser.ImageRenderInfo;
import com.itextpdf.text.pdf.parser.Matrix;
import com.itextpdf.text.pdf.parser.PdfReaderContentParser;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import com.itextpdf.text.pdf.parser.RenderListener;
import com.itextpdf.text.pdf.parser.TextRenderInfo;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

/**
 * Plan du 14/11, point 2 : cohérence de l'en-tête et du pied de page apposés sur les factures. Règles vérifiées sur des
 * milliers de cas tirés au hasard (graine fixe) : zones dans la page, en-tête en haut, pied en bas, jamais l'une sur
 * l'autre, jamais plus de la moitié de la page ; image dans sa zone, centrée, sans déformation, aussi grande que
 * possible ; sur de vraies factures de 1 à 200 lignes, texte identique avant et après, images posées dans leurs zones
 * et nulle part ailleurs, et le corps de la facture jamais recouvert.
 */
public class EnteteFactureCoherenceTest {

    private static final long GRAINE = 20261115L;
    private static final double EPS = 0.01;

    @Test
    public void partiesEtHauteurs() {
        assertEquals(EnteteFacture.ENTETE, EnteteFacture.partie(" entete "));
        assertEquals(EnteteFacture.ENTETE, EnteteFacture.partie("en-tête"));
        assertEquals(EnteteFacture.PIED, EnteteFacture.partie("pied"));
        assertNull(EnteteFacture.partie("milieu"));
        assertNull(EnteteFacture.partie(null));
        Random r = new Random(GRAINE);
        for (int i = 0; i < 5000; i++) {
            int v = r.nextInt(300) - 100;
            int e = EnteteFacture.hauteur(EnteteFacture.ENTETE, v), p = EnteteFacture.hauteur(EnteteFacture.PIED, v);
            assertTrue(e >= EnteteFacture.ENTETE_MIN && e <= EnteteFacture.ENTETE_MAX);
            assertTrue(p >= EnteteFacture.PIED_MIN && p <= EnteteFacture.PIED_MAX);
            if (v >= EnteteFacture.ENTETE_MIN && v <= EnteteFacture.ENTETE_MAX) {
                assertEquals(v, e);
            }
            if (v >= EnteteFacture.PIED_MIN && v <= EnteteFacture.PIED_MAX) {
                assertEquals(v, p);
            }
        }
        assertEquals(EnteteFacture.ENTETE_DEFAUT, EnteteFacture.hauteur(EnteteFacture.ENTETE, null));
        assertEquals(EnteteFacture.PIED_DEFAUT, EnteteFacture.hauteur(EnteteFacture.PIED, null));
    }

    @Test
    public void zonesDansLaPageSansChevauchement() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < 20000; i++) {
            double x0 = r.nextInt(60), y0 = r.nextInt(60), l = 150 + r.nextInt(1100), h = 150 + r.nextInt(1600);
            // 0 (partie absente), bornes, et valeurs au-delà des bornes (la page peut être petite)
            double me = r.nextInt(5) == 0 ? 0 : r.nextInt(120), mp = r.nextInt(5) == 0 ? 0 : r.nextInt(90);
            EnteteFacture.Zone[] z = EnteteFacture.zones(x0, y0, l, h, me, mp);
            EnteteFacture.Zone e = z[0], p = z[1];
            String cas = "cas " + i + " page " + l + "x" + h + " mm " + me + "/" + mp + " " + e + " " + p;
            // en-tête collé en haut, pied collé en bas, toute la largeur
            assertEquals(y0 + h, e.haut(), EPS, cas);
            assertEquals(y0, p.y, EPS, cas);
            assertEquals(x0, e.x, EPS, cas);
            assertEquals(l, e.largeur, EPS, cas);
            assertEquals(l, p.largeur, EPS, cas);
            assertTrue(e.hauteur >= 0 && p.hauteur >= 0, cas);
            // jamais l'une sur l'autre, jamais plus de la moitié de la page
            assertTrue(p.haut() <= e.y + EPS, cas);
            assertTrue(e.hauteur + p.hauteur <= h * EnteteFacture.PART_MAX_PAGE + EPS, cas);
            double de = EnteteFacture.pt(me), dp = EnteteFacture.pt(mp);
            if (de + dp <= h * EnteteFacture.PART_MAX_PAGE) {
                // la hauteur demandée est tenue exactement
                assertEquals(de, e.hauteur, EPS, cas);
                assertEquals(dp, p.hauteur, EPS, cas);
            } else {
                // réduites dans la même proportion, la moitié de la page exactement
                assertEquals(h * EnteteFacture.PART_MAX_PAGE, e.hauteur + p.hauteur, EPS, cas);
                if (de > 0 && dp > 0) {
                    assertEquals(de / dp, e.hauteur / p.hauteur, 1e-6, cas);
                }
            }
            if (me == 0) {
                assertEquals(0, e.hauteur, EPS, cas);
            }
            if (mp == 0) {
                assertEquals(0, p.hauteur, EPS, cas);
            }
        }
    }

    @Test
    public void imageDansSaZoneCentreeSansDeformation() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < 20000; i++) {
            EnteteFacture.Zone z = new EnteteFacture.Zone(r.nextInt(50), r.nextInt(800), 100 + r.nextInt(1000),
                    10 + r.nextInt(250));
            double li = 1 + r.nextInt(5000), hi = 1 + r.nextInt(5000);
            EnteteFacture.Zone p = EnteteFacture.placer(li, hi, z);
            String cas = "cas " + i + " image " + li + "x" + hi + " zone " + z + " -> " + p;
            assertTrue(p.largeur > 0 && p.hauteur > 0, cas);
            // dans la zone
            assertTrue(p.x >= z.x - EPS && p.droite() <= z.droite() + EPS, cas);
            assertTrue(p.y >= z.y - EPS && p.haut() <= z.haut() + EPS, cas);
            // sans déformation
            assertEquals(li / hi, p.largeur / p.hauteur, 1e-6 * Math.max(1, li / hi), cas);
            // centrée
            assertEquals(z.x + z.largeur / 2, p.x + p.largeur / 2, EPS, cas);
            assertEquals(z.y + z.hauteur / 2, p.y + p.hauteur / 2, EPS, cas);
            // aussi grande que possible : elle touche le retrait sur la largeur ou sur la hauteur
            double rc = Math.min(EnteteFacture.pt(EnteteFacture.RETRAIT_COTES_MM), z.largeur / 4);
            double rh = Math.min(EnteteFacture.pt(EnteteFacture.RETRAIT_HAUT_BAS_MM), z.hauteur / 4);
            assertTrue(Math.abs(p.largeur - (z.largeur - 2 * rc)) < EPS
                    || Math.abs(p.hauteur - (z.hauteur - 2 * rh)) < EPS, cas);
        }
        // zone nulle (partie absente) : rien à poser
        EnteteFacture.Zone vide = EnteteFacture.placer(300, 100, new EnteteFacture.Zone(0, 0, 500, 0));
        assertEquals(0, vide.largeur * vide.hauteur, EPS);
    }

    @Test
    public void sansImageLeDocumentEstLeMeme() throws Exception {
        byte[] pdf = facture(PageSize.A4, 30, 100, 100);
        assertSame(pdf, EnteteFacture.apposer(pdf, null));
        assertSame(pdf, EnteteFacture.apposer(pdf, new EnteteFacture.Reglage(null, null)));
        assertSame(pdf, EnteteFacture.apposerSiRegle((javax.persistence.EntityManager) null, pdf));
    }

    /**
     * Rapprochement et bilan sur de vraies factures : 1 à 200 lignes, A4 portrait, A4 paysage, A5 ; en-tête seul, pied
     * seul, les deux. Le texte de chaque page est identique avant et après ; chaque page porte exactement une image par
     * partie réglée, dans sa zone ; aucune ligne du corps ne tombe dans une zone recouverte.
     */
    @Test
    public void facturesDeUnADeuxCentsLignes() throws Exception {
        Random r = new Random(GRAINE + 2);
        Rectangle[] formats = { PageSize.A4, PageSize.A4.rotate(), PageSize.A5 };
        int[] lignes = { 1, 2, 17, 45, 46, 99, 120, 200 };
        byte[] imgLarge = png(1200, 240), imgHaute = png(300, 400), imgCarree = png(500, 500);
        byte[][] images = { imgLarge, imgHaute, imgCarree };
        int cas = 0;
        for (Rectangle format : formats) {
            for (int n : lignes) {
                int me = EnteteFacture.hauteur(EnteteFacture.ENTETE, 10 + r.nextInt(70));
                int mp = EnteteFacture.hauteur(EnteteFacture.PIED, 5 + r.nextInt(55));
                int choix = cas++ % 3; // 0 : les deux, 1 : en-tête seul, 2 : pied seul
                EnteteFacture.Partie e = choix == 2 ? null
                        : new EnteteFacture.Partie(images[r.nextInt(images.length)], me);
                EnteteFacture.Partie p = choix == 1 ? null
                        : new EnteteFacture.Partie(images[r.nextInt(images.length)], mp);
                // le corps de la facture est mis en page hors des zones (marges du modèle >= zones demandées)
                EnteteFacture.Zone[] z = EnteteFacture.zones(0, 0, format.getWidth(), format.getHeight(),
                        e == null ? 0 : me, p == null ? 0 : mp);
                byte[] avant = facture(format, n, (float) z[0].hauteur + 4, (float) z[1].hauteur + 4);
                byte[] apres = EnteteFacture.apposer(avant, new EnteteFacture.Reglage(e, p));
                String libelle = format.getWidth() + "x" + format.getHeight() + " " + n + " lignes, choix " + choix;

                PdfReader ra = new PdfReader(avant), rb = new PdfReader(apres);
                assertEquals(ra.getNumberOfPages(), rb.getNumberOfPages(), libelle);
                int lignesLues = 0;
                for (int i = 1; i <= ra.getNumberOfPages(); i++) {
                    String ta = PdfTextExtractor.getTextFromPage(ra, i), tb = PdfTextExtractor.getTextFromPage(rb, i);
                    assertEquals(ta, tb, libelle + " page " + i);
                    lignesLues += ta.split("Bon n° ", -1).length - 1;

                    Releve rel = new Releve(rb.getPageRotation(i), rb.getPageSize(i).getWidth(),
                            rb.getPageSize(i).getHeight());
                    new PdfReaderContentParser(rb).processContent(i, rel);
                    Rectangle page = rb.getPageSizeWithRotation(i);
                    EnteteFacture.Zone[] zp = EnteteFacture.zones(page.getLeft(), page.getBottom(), page.getWidth(),
                            page.getHeight(), e == null ? 0 : me, p == null ? 0 : mp);
                    assertEquals((e == null ? 0 : 1) + (p == null ? 0 : 1), rel.images.size(), libelle + " page " + i);
                    for (Rectangle2D im : rel.images) {
                        boolean dansEntete = e != null && dedans(im, zp[0]), dansPied = p != null && dedans(im, zp[1]);
                        assertTrue(dansEntete || dansPied, libelle + " page " + i + " image " + im);
                    }
                    // le corps (texte) n'est jamais dans une zone recouverte
                    for (Rectangle2D t : rel.textes) {
                        assertTrue(!chevauche(t, zp[0]) && !chevauche(t, zp[1]),
                                libelle + " page " + i + " texte recouvert " + t);
                    }
                }
                assertEquals(n, lignesLues, libelle);
                ra.close();
                rb.close();
            }
        }
    }

    private static boolean dedans(Rectangle2D r, EnteteFacture.Zone z) {
        return r.getMinX() >= z.x - 0.5 && r.getMaxX() <= z.droite() + 0.5 && r.getMinY() >= z.y - 0.5
                && r.getMaxY() <= z.haut() + 0.5;
    }

    private static boolean chevauche(Rectangle2D r, EnteteFacture.Zone z) {
        return z.hauteur > 0 && r.getMaxY() > z.y + 0.5 && r.getMinY() < z.haut() - 0.5 && r.getMaxX() > z.x
                && r.getMinX() < z.droite();
    }

    /** Facture d'essai : un titre puis n lignes, les marges haute et basse données (points). */
    private static byte[] facture(Rectangle format, int n, float margeHaute, float margeBasse) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(format, 36, 36, margeHaute, margeBasse);
        PdfWriter.getInstance(d, out);
        d.open();
        d.add(new Paragraph("FACTURE N° 6220", new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD)));
        Font f = new Font(Font.FontFamily.HELVETICA, 9);
        for (int i = 1; i <= n; i++) {
            d.add(new Paragraph("Bon n° " + i + "   montant " + (1000 + 37 * i) + " F CFA", f));
        }
        d.close();
        return out.toByteArray();
    }

    private static byte[] png(int l, int h) throws Exception {
        BufferedImage im = new BufferedImage(l, h, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < l; x++) {
            for (int y = 0; y < h; y++) {
                im.setRGB(x, y, (x * 7 + y * 3) & 0xFFFFFF);
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(im, "png", out);
        return out.toByteArray();
    }

    /** Relevé des images (rectangle d'après leur matrice) et des morceaux de texte d'une page. */
    private static final class Releve implements RenderListener {
        final List<Rectangle2D> images = new ArrayList<>(), textes = new ArrayList<>();
        /** Rotation de la page et taille brute : les positions lues sont ramenées dans le repère de la page tournée. */
        private final int rotation;
        private final float largeurBrute, hauteurBrute;

        Releve(int rotation, float largeurBrute, float hauteurBrute) {
            this.rotation = ((rotation % 360) + 360) % 360;
            this.largeurBrute = largeurBrute;
            this.hauteurBrute = hauteurBrute;
        }

        /** Point brut (X, Y) -> point de la page telle qu'affichée. */
        private float[] tourner(float x, float y) {
            switch (rotation) {
            case 90:
                return new float[] { y, largeurBrute - x };
            case 180:
                return new float[] { largeurBrute - x, hauteurBrute - y };
            case 270:
                return new float[] { hauteurBrute - y, x };
            default:
                return new float[] { x, y };
            }
        }

        /** Rectangle englobant des points bruts donnés, dans le repère de la page affichée. */
        private Rectangle2D englobant(float[][] points) {
            float x1 = Float.MAX_VALUE, y1 = Float.MAX_VALUE, x2 = -Float.MAX_VALUE, y2 = -Float.MAX_VALUE;
            for (float[] p : points) {
                float[] q = tourner(p[0], p[1]);
                x1 = Math.min(x1, q[0]);
                y1 = Math.min(y1, q[1]);
                x2 = Math.max(x2, q[0]);
                y2 = Math.max(y2, q[1]);
            }
            return new Rectangle2D.Float(x1, y1, x2 - x1, y2 - y1);
        }

        @Override
        public void renderImage(ImageRenderInfo info) {
            Matrix m = info.getImageCTM();
            float[][] coins = new float[4][];
            int k = 0;
            for (float[] u : new float[][] { { 0, 0 }, { 1, 0 }, { 0, 1 }, { 1, 1 } }) {
                coins[k++] = new float[] { u[0] * m.get(Matrix.I11) + u[1] * m.get(Matrix.I21) + m.get(Matrix.I31),
                        u[0] * m.get(Matrix.I12) + u[1] * m.get(Matrix.I22) + m.get(Matrix.I32) };
            }
            images.add(englobant(coins));
        }

        @Override
        public void renderText(TextRenderInfo info) {
            com.itextpdf.text.pdf.parser.Vector a = info.getDescentLine().getStartPoint(),
                    b = info.getAscentLine().getEndPoint();
            textes.add(englobant(new float[][] { { a.get(0), a.get(1) }, { b.get(0), b.get(1) } }));
        }

        @Override
        public void beginTextBlock() {
        }

        @Override
        public void endTextBlock() {
        }
    }
}
