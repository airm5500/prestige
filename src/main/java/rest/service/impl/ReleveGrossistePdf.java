package rest.service.impl;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.LocationTextExtractionStrategy;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import com.itextpdf.text.pdf.parser.ImageRenderInfo;
import com.itextpdf.text.pdf.parser.PdfReaderContentParser;
import com.itextpdf.text.pdf.parser.RenderListener;
import com.itextpdf.text.pdf.parser.TextRenderInfo;
import com.itextpdf.text.pdf.parser.Vector;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import rest.service.impl.ReleveModele.Cellule;
import rest.service.impl.ReleveModele.LigneBrute;

/**
 * Retours du 09/10 (5) : texte d'un releve grossiste en PDF, page par page, dans l'ordre de lecture (une ligne du
 * tableau = une ligne de texte), pour {@link ReleveGrossiste#lire(String)}. Un PDF scanne (image) ne contient pas de
 * texte : le releve est alors vide et l'ecran le dit.
 */
public final class ReleveGrossistePdf {

    /** Garde-fou : au-dela, le fichier n'est pas un releve. */
    public static final int PAGES_MAX = 200;

    private ReleveGrossistePdf() {
    }

    public static String texte(InputStream pdf) throws IOException {
        PdfReader lecteur = new PdfReader(pdf);
        try {
            StringBuilder sb = new StringBuilder();
            int n = Math.min(lecteur.getNumberOfPages(), PAGES_MAX);
            for (int i = 1; i <= n; i++) {
                sb.append(PdfTextExtractor.getTextFromPage(lecteur, i, new LocationTextExtractionStrategy()))
                        .append('\n');
            }
            return sb.toString();
        } finally {
            lecteur.close();
        }
    }

    /** Lignes au-dela desquelles le releve n'est pas lu (garde-fou memoire). */
    public static final int LIGNES_MAX = 5000;

    /** Filets de tableau ecrits en texte : ils separent deux cellules. */
    private static final String FILETS = "|\u00a6\u2502\u2503\u2551\u250a\u250b";

    /** Un caractere place sur la page : u le long de la ligne, v vers le haut de la page. */
    private static final class Glyphe {

        final String texte;
        final float u0, u1, v, espace;

        Glyphe(String texte, float u0, float u1, float v, float espace) {
            this.texte = texte;
            this.u0 = u0;
            this.u1 = u1;
            this.v = v;
            this.espace = espace;
        }
    }

    /** Releve les caracteres d'une page avec leur ligne de base. */
    private static final class Collecteur implements RenderListener {

        final List<float[]> bruts = new ArrayList<>();
        final List<String> textes = new ArrayList<>();

        @Override
        public void renderText(TextRenderInfo info) {
            float espace = info.getSingleSpaceWidth();
            for (TextRenderInfo c : info.getCharacterRenderInfos()) {
                String t = c.getText();
                if (t == null || t.trim().isEmpty()) {
                    continue;
                }
                Vector a = c.getBaseline().getStartPoint(), b = c.getBaseline().getEndPoint();
                bruts.add(new float[] { a.get(Vector.I1), a.get(Vector.I2), b.get(Vector.I1), b.get(Vector.I2),
                        espace > 0.5f ? espace : 3f });
                textes.add(t);
            }
        }

        /**
         * Sens d'ecriture dominant (page tournee ou non) : seuls les caracteres ecrits dans ce sens sont gardes (un
         * filigrane en biais est ignore).
         */
        List<Glyphe> glyphes() {
            int[] sens = new int[4];
            for (float[] g : bruts) {
                int k = sens(g);
                if (k >= 0) {
                    sens[k]++;
                }
            }
            int dominant = 0;
            for (int k = 1; k < 4; k++) {
                if (sens[k] > sens[dominant]) {
                    dominant = k;
                }
            }
            /* direction d'ecriture (dx, dy) et « haut » du texte (-dy, dx) */
            float dx = dominant == 0 ? 1 : dominant == 2 ? -1 : 0, dy = dominant == 1 ? 1 : dominant == 3 ? -1 : 0;
            List<Glyphe> sortie = new ArrayList<>();
            for (int i = 0; i < bruts.size(); i++) {
                float[] g = bruts.get(i);
                if (sens(g) != dominant) {
                    continue;
                }
                float u0 = g[0] * dx + g[1] * dy, u1 = g[2] * dx + g[3] * dy, v = -g[0] * dy + g[1] * dx;
                sortie.add(new Glyphe(textes.get(i), u0, Math.max(u0, u1), v, g[4]));
            }
            return sortie;
        }

        /** 0 vers la droite, 1 vers le haut, 2 vers la gauche, 3 vers le bas ; -1 en biais. */
        private static int sens(float[] g) {
            float ddx = g[2] - g[0], ddy = g[3] - g[1], n = (float) Math.hypot(ddx, ddy);
            if (n < 0.01f) {
                return -1;
            }
            ddx /= n;
            ddy /= n;
            return ddx > 0.98f ? 0 : ddy > 0.98f ? 1 : ddx < -0.98f ? 2 : ddy < -0.98f ? 3 : -1;
        }

        @Override
        public void beginTextBlock() {
        }

        @Override
        public void endTextBlock() {
        }

        @Override
        public void renderImage(ImageRenderInfo info) {
        }
    }

    /**
     * Lignes du releve decoupees en cellules : les caracteres de meme hauteur forment une ligne, un blanc de plus de
     * deux espaces (ou un filet « | ») separe deux cellules (deux colonnes du tableau).
     */
    public static List<LigneBrute> lignes(InputStream pdf) throws IOException {
        PdfReader lecteur = new PdfReader(pdf);
        List<LigneBrute> sortie = new ArrayList<>();
        try {
            PdfReaderContentParser analyseur = new PdfReaderContentParser(lecteur);
            int n = Math.min(lecteur.getNumberOfPages(), PAGES_MAX);
            for (int p = 1; p <= n && sortie.size() < LIGNES_MAX; p++) {
                Collecteur c = analyseur.processContent(p, new Collecteur());
                sortie.addAll(lignes(p, c.glyphes()));
            }
        } finally {
            lecteur.close();
        }
        return sortie.size() > LIGNES_MAX ? new ArrayList<>(sortie.subList(0, LIGNES_MAX)) : sortie;
    }

    private static List<LigneBrute> lignes(int page, List<Glyphe> glyphes) {
        /* de haut en bas, puis de gauche a droite ; meme ligne si la ligne de base differe de 2 points au plus */
        glyphes.sort((a, b) -> Float.compare(b.v, a.v));
        List<List<Glyphe>> rangs = new ArrayList<>();
        List<Glyphe> courant = null;
        float y = Float.NaN;
        for (Glyphe g : glyphes) {
            if (courant == null || Math.abs(g.v - y) > 2f) {
                courant = new ArrayList<>();
                rangs.add(courant);
                y = g.v;
            }
            courant.add(g);
        }
        List<LigneBrute> sortie = new ArrayList<>();
        for (List<Glyphe> r : rangs) {
            r.sort((a, b) -> Float.compare(a.u0, b.u0));
            List<Cellule> cellules = new ArrayList<>();
            StringBuilder t = null;
            float x0 = 0, x1 = 0;
            for (Glyphe g : r) {
                float blanc = g.u0 - x1;
                boolean filet = FILETS.indexOf(g.texte.charAt(0)) >= 0 && g.texte.trim().length() == 1;
                if (t != null && (filet || blanc > 2.2f * g.espace)) {
                    cellules.add(new Cellule(t.toString(), x0, x1));
                    t = null;
                }
                if (filet) {
                    x1 = Math.max(x1, g.u1);
                    continue;
                }
                if (t == null) {
                    t = new StringBuilder();
                    x0 = g.u0;
                } else if (blanc > 0.4f * g.espace) {
                    t.append(' ');
                }
                /* caractere repeint au meme endroit (gras simule) : garde une fois */
                if (blanc > -0.5f || t.length() == 0) {
                    t.append(g.texte);
                }
                x1 = Math.max(x1, g.u1);
            }
            if (t != null) {
                cellules.add(new Cellule(t.toString(), x0, x1));
            }
            sortie.add(new LigneBrute(page, cellules));
        }
        return sortie;
    }
}
