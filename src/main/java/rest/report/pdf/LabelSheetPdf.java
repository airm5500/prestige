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
import java.util.function.UnaryOperator;
import org.apache.commons.lang3.StringUtils;

/**
 * Genere la planche d'etiquettes A4 (65 etiquettes, 5 colonnes x 13 lignes) directement en PDF
 * vectoriel : les cotes sont exprimees en millimetres et converties en points PDF, la grille est
 * centree sur la page et aucune image bitmap n'est utilisee. Le document demande aux lecteurs PDF
 * de ne pas appliquer de mise a l'echelle a l'impression (PrintScaling = None), ce qui supprime
 * les decalages constates entre Firefox, Adobe Reader et les pilotes d'impression.
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

        public LabelData(String officine, String grossiste, String designation, String cip, String prix,
                String date) {
            this.officine = officine;
            this.grossiste = grossiste;
            this.designation = designation;
            this.cip = cip;
            this.prix = prix;
            this.date = date;
        }
    }

    /** Geometrie d'une planche : grille centree sur la page A4. */
    public static final class SheetFormat {

        private final int columns;
        private final int rows;
        private final float labelWidthMm;
        private final float labelHeightMm;
        private final float gapHMm;
        private final float gapVMm;

        private SheetFormat(int columns, int rows, float labelWidthMm, float labelHeightMm, float gapHMm,
                float gapVMm) {
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
    }

    /**
     * Resout la geometrie de la planche a partir du modele demande. Le modele PERSONNALISE lit les
     * dimensions dans la configuration (t_parameters) via le lecteur fourni.
     *
     * @param modele valeur de modele_ETIQUETTE, peut etre null ou vide
     * @param paramReader acces aux valeurs de t_parameters (peut etre null)
     */
    public static SheetFormat formatFor(String modele, UnaryOperator<String> paramReader) {
        String normalized = StringUtils.trimToEmpty(modele).toUpperCase();
        switch (normalized) {
        case MODELE_ARRONDI_38X21:
            return new SheetFormat(5, 13, 38f, 21f, 0f, 0f);
        case MODELE_CARRE_38_1X21_2:
            // planche predecoupee 38,1 x 21,2 avec espace horizontal entre les colonnes
            return new SheetFormat(5, 13, 38.1f, 21.2f, 2.54f, 0f);
        case MODELE_PERSONNALISE:
            return new SheetFormat(readInt(paramReader, KEY_NB_COLONNES, 5),
                    readInt(paramReader, KEY_NB_LIGNES, 13), readFloat(paramReader, KEY_LARGEUR_MM, 38f),
                    readFloat(paramReader, KEY_HAUTEUR_MM, 21.2f), readFloat(paramReader, KEY_ESPACE_H_MM, 0f),
                    readFloat(paramReader, KEY_ESPACE_V_MM, 0f));
        case MODELE_CARRE_38X21_2:
        default:
            return new SheetFormat(5, 13, 38f, 21.2f, 0f, 0f);
        }
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
        try {
            String value = reader != null ? reader.apply(key) : null;
            return StringUtils.isNotBlank(value) ? Float.parseFloat(value.trim().replace(',', '.'))
                    : defaultValue;
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * Ecrit le PDF de la planche d'etiquettes dans le flux fourni.
     *
     * @param out flux de sortie (non ferme par cette methode en cas d'echec d'ouverture)
     * @param labels etiquettes a imprimer, dans l'ordre
     * @param startPosition premiere position utilisee sur la premiere feuille (1..nb par page)
     * @param format geometrie de la planche
     */
    public static void write(OutputStream out, List<LabelData> labels, int startPosition, SheetFormat format)
            throws Exception {
        float pageWidth = mm(PAGE_WIDTH_MM);
        float pageHeight = mm(PAGE_HEIGHT_MM);
        float labelWidth = mm(format.labelWidthMm);
        float labelHeight = mm(format.labelHeightMm);
        float gapH = mm(format.gapHMm);
        float gapV = mm(format.gapVMm);
        float gridWidth = format.columns * labelWidth + (format.columns - 1) * gapH;
        float gridHeight = format.rows * labelHeight + (format.rows - 1) * gapV;
        float marginLeft = (pageWidth - gridWidth) / 2f;
        float marginTop = (pageHeight - gridHeight) / 2f;

        Document document = new Document(new Rectangle(pageWidth, pageHeight), 0, 0, 0, 0);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        // Impression a l'echelle 100% : le lecteur ne doit pas reajuster la page.
        writer.addViewerPreference(PdfName.PRINTSCALING, PdfName.NONE);
        document.open();

        BaseFont regular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        BaseFont bold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        PdfContentByte cb = writer.getDirectContent();

        int perPage = format.perPage();
        int position = Math.min(Math.max(startPosition, 1), perPage) - 1;
        for (LabelData label : labels) {
            if (position >= perPage) {
                document.newPage();
                position = 0;
            }
            int col = position % format.columns;
            int row = position / format.columns;
            float x = marginLeft + col * (labelWidth + gapH);
            float y = pageHeight - marginTop - row * (labelHeight + gapV) - labelHeight;
            drawLabel(cb, label, x, y, labelWidth, labelHeight, regular, bold);
            position++;
        }
        document.close();
    }

    private static void drawLabel(PdfContentByte cb, LabelData data, float x, float y, float width,
            float height, BaseFont regular, BaseFont bold) {
        float padX = mm(1.6f);
        float maxTextWidth = width - 2f * padX;
        float centerX = x + width / 2f;

        showCentered(cb, bold, 5.5f, fit(bold, data.officine, 5.5f, maxTextWidth), centerX, y + height - 7f);

        String line2 = joinNonBlank(data.grossiste, data.date);
        showCentered(cb, regular, 5f, fit(regular, line2, 5f, maxTextWidth), centerX, y + height - 13f);

        showCentered(cb, bold, 5.5f, fit(bold, data.designation, 5.5f, maxTextWidth), centerX,
                y + height - 19.5f);

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
            cb.addTemplate(template, scale, 0, 0, 1, centerX - targetWidth / 2f, y + 12f);
        }

        showText(cb, regular, 5f, fit(regular, data.cip, 5f, maxTextWidth / 2f), x + padX, y + 4f,
                PdfContentByte.ALIGN_LEFT);
        showText(cb, bold, 6.5f, fit(bold, data.prix, 6.5f, maxTextWidth / 2f), x + width - padX, y + 4f,
                PdfContentByte.ALIGN_RIGHT);
    }

    private static void showCentered(PdfContentByte cb, BaseFont font, float size, String text, float x,
            float y) {
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
