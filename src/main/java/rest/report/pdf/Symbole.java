package rest.report.pdf;

/**
 * Personnalisation des etiquettes : modules d'un code (vrai = noir), sans sa zone de silence, et la largeur de cette
 * zone en modules. Sert au controle de lisibilite (taille d'un point du code), au dessin du PDF et a l'apercu a
 * l'ecran, pour que les trois voient exactement le meme code.
 * <ul>
 * <li>DataMatrix (et DataMatrix+) : GS1 avec FNC1 ({@link Gs1DataMatrix}), silence d'un module ;</li>
 * <li>QR (et QR+) : correction d'erreur L comme les etiquettes existantes, silence de 4 modules (norme) ;</li>
 * <li>code-barres du CIP (Code 128) : une ligne de modules, silence de 10 modules a gauche et a droite.</li>
 * </ul>
 */
public final class Symbole {

    public static final String CODE128 = LabelSheetPdf.CODE_BARRES, QR = LabelSheetPdf.QR,
            DATAMATRIX = LabelSheetPdf.DATAMATRIX, QR_PLUS = LabelSheetPdf.QR_PLUS,
            DATAMATRIX_PLUS = LabelSheetPdf.DATAMATRIX_PLUS;

    private final boolean[][] modules;
    private final int silence;
    private final boolean lineaire;

    private Symbole(boolean[][] modules, int silence, boolean lineaire) {
        this.modules = modules;
        this.silence = silence;
        this.lineaire = lineaire;
    }

    /** Symbole du type donne pour ce contenu. */
    public static Symbole de(String type, String contenu) {
        String c = contenu == null ? "" : contenu;
        if (DATAMATRIX.equals(type) || DATAMATRIX_PLUS.equals(type)) {
            return new Symbole(Gs1DataMatrix.matrice(c), 1, false);
        }
        if (QR.equals(type) || QR_PLUS.equals(type)) {
            try {
                com.itextpdf.text.pdf.qrcode.ByteMatrix m = new com.itextpdf.text.pdf.qrcode.QRCodeWriter().encode(c, 1,
                        1, null);
                /* la matrice rendue contient deja la zone de silence de 4 modules : on la retire ici */
                int q = 4, n = m.getWidth() - 2 * q;
                boolean[][] b = new boolean[n][n];
                for (int y = 0; y < n; y++) {
                    for (int x = 0; x < n; x++) {
                        /* matrice d'iText : 0 = noir, -1 (255) = blanc */
                        b[y][x] = m.get(x + q, y + q) == 0;
                    }
                }
                return new Symbole(b, q, false);
            } catch (com.itextpdf.text.pdf.qrcode.WriterException e) {
                throw new IllegalArgumentException("Contenu trop long pour un QR code", e);
            }
        }
        byte[] barres = com.itextpdf.text.pdf.Barcode128
                .getBarsCode128Raw(com.itextpdf.text.pdf.Barcode128.getRawText(c, false));
        int total = 0;
        for (byte b : barres) {
            total += b;
        }
        boolean[][] ligne = new boolean[1][total];
        int pos = 0;
        for (int i = 0; i < barres.length; i++) {
            for (int k = 0; k < barres[i]; k++) {
                ligne[0][pos++] = i % 2 == 0;
            }
        }
        return new Symbole(ligne, 10, true);
    }

    public boolean[][] getModules() {
        return modules;
    }

    public int getSilence() {
        return silence;
    }

    public boolean isLineaire() {
        return lineaire;
    }

    /** Largeur totale en modules, zone de silence comprise. */
    public int largeurTotale() {
        return modules[0].length + 2 * silence;
    }

    /** Hauteur totale en modules, zone de silence comprise (code 2D seulement). */
    public int hauteurTotale() {
        return lineaire ? 1 : modules.length + 2 * silence;
    }

    /**
     * Taille d'un point (mm) quand le code occupe ce cadre : code 2D carre, le plus grand qui tient ; code-barres sur
     * toute la largeur.
     */
    public float module(float largeurMm, float hauteurMm) {
        if (lineaire) {
            return largeurMm / largeurTotale();
        }
        return Math.min(largeurMm / largeurTotale(), hauteurMm / hauteurTotale());
    }

    /** Modules en texte compact (une ligne par rangee, « 1 » noir, « 0 » blanc), pour l'apercu a l'ecran. */
    public String[] lignes() {
        String[] r = new String[modules.length];
        for (int y = 0; y < modules.length; y++) {
            StringBuilder b = new StringBuilder(modules[y].length);
            for (boolean m : modules[y]) {
                b.append(m ? '1' : '0');
            }
            r[y] = b.toString();
        }
        return r;
    }
}
