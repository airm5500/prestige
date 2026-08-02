package rest.report.pdf;

import com.itextpdf.text.Document;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.Barcode128;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfName;
import com.itextpdf.text.pdf.PdfTemplate;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.OutputStream;
import java.util.List;
import java.util.Locale;
import java.util.function.UnaryOperator;
import org.apache.commons.lang3.StringUtils;

/**
 * Genere la planche d'etiquettes A4 (65 etiquettes, 5 colonnes x 13 lignes) directement en PDF vectoriel : les cotes
 * sont exprimees en millimetres et converties en points PDF, la grille est centree sur la page et aucune image bitmap
 * n'est utilisee. Le document demande aux lecteurs PDF de ne pas appliquer de mise a l'echelle a l'impression
 * (PrintScaling = None), ce qui supprime les decalages constates entre Firefox, Adobe Reader et les pilotes
 * d'impression.
 *
 * Un calage fin est possible via la configuration (t_parameters) sans redeploiement : marges physiques du papier (sinon
 * grille centree), decalage global X/Y en millimetres (valeurs negatives admises) et echelle en pourcent pour compenser
 * un pilote qui reduit systematiquement la page. La page de test (writeTestPage) imprime les contours des etiquettes et
 * une regle de controle pour mesurer ces corrections.
 */
public final class LabelSheetPdf {

    public static final String MODELE_CARRE_38X21_2 = "CARRE_38X21_2";
    public static final String MODELE_ARRONDI_38X21 = "ARRONDI_38X21";
    public static final String MODELE_CARRE_38_1X21_2 = "CARRE_38_1X21_2";
    public static final String MODELE_PERSONNALISE = "PERSONNALISE";

    public static final String KEY_MODELE = "KEY_ETIQUETTE_MODELE";
    public static final String KEY_NB_COLONNES = "KEY_ETIQUETTE_NB_COLONNES";
    public static final String KEY_NB_LIGNES = "KEY_ETIQUETTE_NB_LIGNES";
    public static final String KEY_LARGEUR_MM = "KEY_ETIQUETTE_LARGEUR_MM";
    public static final String KEY_HAUTEUR_MM = "KEY_ETIQUETTE_HAUTEUR_MM";
    public static final String KEY_ESPACE_H_MM = "KEY_ETIQUETTE_ESPACE_H_MM";
    public static final String KEY_ESPACE_V_MM = "KEY_ETIQUETTE_ESPACE_V_MM";
    public static final String KEY_MARGE_GAUCHE_MM = "KEY_ETIQUETTE_MARGE_GAUCHE_MM";
    public static final String KEY_MARGE_HAUT_MM = "KEY_ETIQUETTE_MARGE_HAUT_MM";
    public static final String KEY_DECALAGE_X_MM = "KEY_ETIQUETTE_DECALAGE_X_MM";
    public static final String KEY_DECALAGE_Y_MM = "KEY_ETIQUETTE_DECALAGE_Y_MM";
    public static final String KEY_ECHELLE_POURCENT = "KEY_ETIQUETTE_ECHELLE_POURCENT";

    private static final float MM_TO_PT = 72f / 25.4f;
    private static final float PAGE_WIDTH_MM = 210f;
    private static final float PAGE_HEIGHT_MM = 297f;

    private LabelSheetPdf() {
    }

    /** Donnees d'une etiquette. */
    public static final class LabelData {

        private final String officine;
        private final String grossiste;
        private final String designation;
        private final String cip;
        private final String prix;
        private final String date;

        public LabelData(String officine, String grossiste, String designation, String cip, String prix, String date) {
            this.officine = officine;
            this.grossiste = grossiste;
            this.designation = designation;
            this.cip = cip;
            this.prix = prix;
            this.date = date;
        }
    }

    /** Geometrie d'une planche : grille sur page A4, avec calage optionnel lu dans la configuration. */
    public static final class SheetFormat {

        private final String modele;
        private final int columns;
        private final int rows;
        private final float labelWidthMm;
        private final float labelHeightMm;
        private final float gapHMm;
        private final float gapVMm;
        // calage : marges physiques (null = grille centree), decalage global et echelle
        private Float marginLeftMm;
        private Float marginTopMm;
        private float offsetXMm;
        private float offsetYMm;
        private float scale = 1f;

        private SheetFormat(String modele, int columns, int rows, float labelWidthMm, float labelHeightMm, float gapHMm,
                float gapVMm) {
            this.modele = modele;
            this.columns = Math.max(1, columns);
            this.rows = Math.max(1, rows);
            this.labelWidthMm = labelWidthMm;
            this.labelHeightMm = labelHeightMm;
            this.gapHMm = Math.max(0f, gapHMm);
            this.gapVMm = Math.max(0f, gapVMm);
        }

        public int perPage() {
            return columns * rows;
        }

        public String getModele() {
            return modele;
        }
    }

    /**
     * Resout la geometrie de la planche a partir du modele demande. Le modele PERSONNALISE lit les dimensions dans la
     * configuration (t_parameters) via le lecteur fourni. Les parametres de calage (marges, decalages, echelle)
     * s'appliquent a tous les modeles.
     *
     * @param modele
     *            valeur de modele_ETIQUETTE, peut etre null ou vide
     * @param paramReader
     *            acces aux valeurs de t_parameters (peut etre null)
     */
    public static SheetFormat formatFor(String modele, UnaryOperator<String> paramReader) {
        String normalized = StringUtils.trimToEmpty(modele).toUpperCase(Locale.ROOT);
        SheetFormat format;
        switch (normalized) {
        case MODELE_ARRONDI_38X21:
            format = new SheetFormat(MODELE_ARRONDI_38X21, 5, 13, 38f, 21f, 0f, 0f);
            break;
        case MODELE_CARRE_38_1X21_2:
            // planche predecoupee 38,1 x 21,2 avec espace horizontal entre les colonnes
            format = new SheetFormat(MODELE_CARRE_38_1X21_2, 5, 13, 38.1f, 21.2f, 2.54f, 0f);
            break;
        case MODELE_PERSONNALISE:
            format = new SheetFormat(MODELE_PERSONNALISE, readInt(paramReader, KEY_NB_COLONNES, 5),
                    readInt(paramReader, KEY_NB_LIGNES, 13), readFloat(paramReader, KEY_LARGEUR_MM, 38f),
                    readFloat(paramReader, KEY_HAUTEUR_MM, 21.2f), readFloat(paramReader, KEY_ESPACE_H_MM, 0f),
                    readFloat(paramReader, KEY_ESPACE_V_MM, 0f));
            break;
        case MODELE_CARRE_38X21_2:
        default:
            format = new SheetFormat(MODELE_CARRE_38X21_2, 5, 13, 38f, 21.2f, 0f, 0f);
            break;
        }
        format.marginLeftMm = readOptionalFloat(paramReader, KEY_MARGE_GAUCHE_MM);
        format.marginTopMm = readOptionalFloat(paramReader, KEY_MARGE_HAUT_MM);
        format.offsetXMm = readFloat(paramReader, KEY_DECALAGE_X_MM, 0f);
        format.offsetYMm = readFloat(paramReader, KEY_DECALAGE_Y_MM, 0f);
        float scalePercent = readFloat(paramReader, KEY_ECHELLE_POURCENT, 100f);
        if (scalePercent < 50f || scalePercent > 150f) {
            scalePercent = 100f;
        }
        format.scale = scalePercent / 100f;
        return format;
    }

    private static int readInt(UnaryOperator<String> reader, String key, int defaultValue) {
        try {
            String value = reader != null ? reader.apply(key) : null;
            return StringUtils.isNotBlank(value) ? Integer.parseInt(value.trim()) : defaultValue;
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private static float readFloat(UnaryOperator<String> reader, String key, float defaultValue) {
        Float value = readOptionalFloat(reader, key);
        return value != null ? value : defaultValue;
    }

    private static Float readOptionalFloat(UnaryOperator<String> reader, String key) {
        try {
            String value = reader != null ? reader.apply(key) : null;
            return StringUtils.isNotBlank(value) ? Float.valueOf(value.trim().replace(',', '.')) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Geometrie effective en points PDF, calage applique. */
    private static final class Grid {

        final float pageWidth = mm(PAGE_WIDTH_MM);
        final float pageHeight = mm(PAGE_HEIGHT_MM);
        final float cellWidth;
        final float cellHeight;
        final float stepX;
        final float stepY;
        final float originLeft;
        final float originTop;
        final float scale;

        Grid(SheetFormat f) {
            this.scale = f.scale;
            this.cellWidth = mm(f.labelWidthMm) * f.scale;
            this.cellHeight = mm(f.labelHeightMm) * f.scale;
            this.stepX = mm(f.labelWidthMm + f.gapHMm) * f.scale;
            this.stepY = mm(f.labelHeightMm + f.gapVMm) * f.scale;
            float gridWidth = f.columns * this.cellWidth + (f.columns - 1) * mm(f.gapHMm) * f.scale;
            float gridHeight = f.rows * this.cellHeight + (f.rows - 1) * mm(f.gapVMm) * f.scale;
            float left = f.marginLeftMm != null ? mm(f.marginLeftMm) : (this.pageWidth - gridWidth) / 2f;
            float top = f.marginTopMm != null ? mm(f.marginTopMm) : (this.pageHeight - gridHeight) / 2f;
            this.originLeft = left + mm(f.offsetXMm);
            this.originTop = top + mm(f.offsetYMm);
        }

        float x(int col) {
            return originLeft + col * stepX;
        }

        /** Ordonnee PDF (depuis le bas) du bord inferieur de la cellule. */
        float y(int row) {
            return pageHeight - originTop - row * stepY - cellHeight;
        }
    }

    /**
     * Ecrit le PDF de la planche d'etiquettes dans le flux fourni.
     *
     * @param out
     *            flux de sortie
     * @param labels
     *            etiquettes a imprimer, dans l'ordre
     * @param startPosition
     *            premiere position utilisee sur la premiere feuille (1..nb par page)
     * @param format
     *            geometrie de la planche
     */
    public static void write(OutputStream out, List<LabelData> labels, int startPosition, SheetFormat format)
            throws Exception {
        Grid grid = new Grid(format);
        Document document = new Document(new Rectangle(grid.pageWidth, grid.pageHeight), 0, 0, 0, 0);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        // Impression a l'echelle 100% : le lecteur ne doit pas reajuster la page.
        writer.addViewerPreference(PdfName.PRINTSCALING, PdfName.NONE);
        document.open();

        BaseFont regular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        BaseFont bold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        PdfContentByte cb = writer.getDirectContent();

        float labelWidth = mm(format.labelWidthMm);
        float labelHeight = mm(format.labelHeightMm);
        int perPage = format.perPage();
        int position = Math.min(Math.max(startPosition, 1), perPage) - 1;
        for (LabelData label : labels) {
            if (position >= perPage) {
                document.newPage();
                position = 0;
            }
            int col = position % format.columns;
            int row = position / format.columns;
            cb.saveState();
            // le contenu est dessine en cotes nominales puis mis a l'echelle dans la cellule
            cb.concatCTM(grid.scale, 0, 0, grid.scale, grid.x(col), grid.y(row));
            drawLabel(cb, label, labelWidth, labelHeight, regular, bold);
            cb.restoreState();
            position++;
        }
        document.close();
    }

    /**
     * Ecrit une page de test de calibrage : contours et numeros de toutes les positions, regle de controle et rappel
     * des parametres de calage. A imprimer a 100% puis superposer sur une planche d'etiquettes.
     */
    public static void writeTestPage(OutputStream out, SheetFormat format) throws Exception {
        Grid grid = new Grid(format);
        Document document = new Document(new Rectangle(grid.pageWidth, grid.pageHeight), 0, 0, 0, 0);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        writer.addViewerPreference(PdfName.PRINTSCALING, PdfName.NONE);
        document.open();

        BaseFont regular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        BaseFont bold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        PdfContentByte cb = writer.getDirectContent();

        cb.setLineWidth(0.5f);
        for (int row = 0; row < format.rows; row++) {
            for (int col = 0; col < format.columns; col++) {
                float x = grid.x(col);
                float y = grid.y(row);
                cb.rectangle(x, y, grid.cellWidth, grid.cellHeight);
                cb.stroke();
                int number = row * format.columns + col + 1;
                showText(cb, bold, 8f, String.valueOf(number), x + grid.cellWidth / 2f, y + grid.cellHeight / 2f - 3f,
                        PdfContentByte.ALIGN_CENTER);
            }
        }

        // regle de controle horizontale sous la grille : graduation tous les 10 mm
        float gridWidth = format.columns * grid.cellWidth + (format.columns - 1) * (grid.stepX - grid.cellWidth);
        float rulerY = Math.max(grid.y(format.rows - 1) - mm(4f), mm(3f));
        cb.setLineWidth(0.5f);
        cb.moveTo(grid.originLeft, rulerY);
        cb.lineTo(grid.originLeft + gridWidth, rulerY);
        cb.stroke();
        for (float posMm = 0f; posMm <= gridWidth / MM_TO_PT + 0.01f; posMm += 10f) {
            float x = grid.originLeft + mm(posMm);
            cb.moveTo(x, rulerY);
            cb.lineTo(x, rulerY + mm(1.5f));
            cb.stroke();
        }
        String largeur = String.format(Locale.FRANCE, "%.1f", gridWidth / MM_TO_PT);

        // consignes dans la marge haute et basse
        showText(cb, bold, 7f,
                "PAGE DE TEST ETIQUETTES [" + format.getModele() + "] - imprimer a 100% (taille reelle) sur A4",
                grid.pageWidth / 2f, grid.pageHeight - mm(4.5f), PdfContentByte.ALIGN_CENTER);
        showText(cb, regular, 6f,
                "Superposer sur une planche d'etiquettes : la regle ci-dessus doit mesurer exactement " + largeur
                        + " mm (sinon ajuster KEY_ETIQUETTE_ECHELLE_POURCENT)",
                grid.pageWidth / 2f, mm(4f), PdfContentByte.ALIGN_CENTER);
        showText(cb, regular, 6f,
                "Corrections en configuration : KEY_ETIQUETTE_DECALAGE_X_MM / _Y_MM (+ = droite/bas), "
                        + "KEY_ETIQUETTE_MARGE_GAUCHE_MM / _HAUT_MM",
                grid.pageWidth / 2f, mm(1.5f), PdfContentByte.ALIGN_CENTER);
        document.close();
    }

    private static void drawLabel(PdfContentByte cb, LabelData data, float width, float height, BaseFont regular,
            BaseFont bold) {
        float padX = mm(1.6f);
        float maxTextWidth = width - 2f * padX;
        float centerX = width / 2f;

        showCentered(cb, bold, 5.5f, fit(bold, data.officine, 5.5f, maxTextWidth), centerX, height - 7f);

        String line2 = joinNonBlank(data.grossiste, data.date);
        showCentered(cb, regular, 5f, fit(regular, line2, 5f, maxTextWidth), centerX, height - 13f);

        showCentered(cb, bold, 5.5f, fit(bold, data.designation, 5.5f, maxTextWidth), centerX, height - 19.5f);

        if (StringUtils.isNotBlank(data.cip)) {
            Barcode128 barcode = new Barcode128();
            barcode.setCode(data.cip.trim());
            barcode.setFont(null);
            barcode.setBarHeight(13f);
            barcode.setX(0.9f);
            PdfTemplate template = barcode.createTemplateWithBarcode(cb, null, null);
            float barcodeWidth = template.getWidth();
            float targetWidth = Math.min(barcodeWidth, maxTextWidth);
            float scale = targetWidth / barcodeWidth;
            cb.addTemplate(template, scale, 0, 0, 1, centerX - targetWidth / 2f, 12f);
        }

        showText(cb, regular, 5f, fit(regular, data.cip, 5f, maxTextWidth / 2f), padX, 4f, PdfContentByte.ALIGN_LEFT);
        showText(cb, bold, 6.5f, fit(bold, data.prix, 6.5f, maxTextWidth / 2f), width - padX, 4f,
                PdfContentByte.ALIGN_RIGHT);
    }

    private static void showCentered(PdfContentByte cb, BaseFont font, float size, String text, float x, float y) {
        showText(cb, font, size, text, x, y, PdfContentByte.ALIGN_CENTER);
    }

    private static void showText(PdfContentByte cb, BaseFont font, float size, String text, float x, float y,
            int align) {
        if (StringUtils.isBlank(text)) {
            return;
        }
        cb.beginText();
        cb.setFontAndSize(font, size);
        cb.showTextAligned(align, text, x, y, 0);
        cb.endText();
    }

    private static String joinNonBlank(String left, String right) {
        boolean hasLeft = StringUtils.isNotBlank(left);
        boolean hasRight = StringUtils.isNotBlank(right);
        if (hasLeft && hasRight) {
            return left.trim() + " - " + right.trim();
        }
        if (hasLeft) {
            return left.trim();
        }
        return hasRight ? right.trim() : "";
    }

    private static String fit(BaseFont font, String text, float size, float maxWidth) {
        if (StringUtils.isBlank(text)) {
            return "";
        }
        String value = text.trim();
        while (value.length() > 1 && font.getWidthPoint(value, size) > maxWidth) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private static float mm(float value) {
        return value * MM_TO_PT;
    }
}
