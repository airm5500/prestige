package rest.service.utils;

import commonTasks.dto.ValorisationDTO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.BiConsumer;
import javax.ejb.Stateless;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;

/**
 *
 * @author koben
 */
@Stateless
public class ReportExcelExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Crée un fichier Excel avec en-tête et données
     *
     * @param title
     *            Titre du rapport
     * @param headers
     *            En-têtes des colonnes
     * @param data
     *            Liste des données
     * @param rowMapper
     *            Fonction pour mapper chaque élément de data vers les cellules
     * @param <T>
     *            Type des données
     *
     * @return ByteArray du fichier Excel
     *
     * @throws java.io.IOException
     */
    public <T> byte[] createExcelReport(String title, String[] headers, List<T> data, BiConsumer<Row, T> rowMapper)
            throws IOException {
        return createExcelReport(title, headers, data, rowMapper, false);
    }

    /**
     * Variante en orientation paysage (mise en page d'impression : A4 paysage, ajustement sur une page en largeur).
     *
     * @param <T>
     *            Type des données
     * @param title
     *            Titre du rapport
     * @param headers
     *            En-têtes des colonnes
     * @param data
     *            Liste des données
     * @param rowMapper
     *            Fonction pour mapper chaque élément de data vers les cellules
     *
     * @return ByteArray du fichier Excel
     *
     * @throws java.io.IOException
     */
    public <T> byte[] createLandscapeExcelReport(String title, String[] headers, List<T> data,
            BiConsumer<Row, T> rowMapper) throws IOException {
        return createExcelReport(title, headers, data, rowMapper, true);
    }

    private <T> byte[] createExcelReport(String title, String[] headers, List<T> data, BiConsumer<Row, T> rowMapper,
            boolean landscape) throws IOException {

        try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sanitizeSheetName(title));

            // Créer les styles
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            int rowNum = 0;

            // Ligne de titre
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(title);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, headers.length - 1));

            // Ligne de date d'export
            Row dateRow = sheet.createRow(rowNum++);
            Cell dateCell = dateRow.createCell(0);
            dateCell.setCellValue("Généré le: " + LocalDateTime.now().format(DATETIME_FORMATTER));
            dateCell.setCellStyle(dateStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, headers.length - 1));

            // Ligne d'en-têtes
            Row headerRow = sheet.createRow(rowNum++);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Lignes de données
            for (T item : data) {
                Row row = sheet.createRow(rowNum++);
                rowMapper.accept(row, item);
            }

            // Auto-dimensionner les colonnes
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            if (landscape) {
                org.apache.poi.ss.usermodel.PrintSetup ps = sheet.getPrintSetup();
                ps.setLandscape(true);
                ps.setPaperSize(org.apache.poi.ss.usermodel.PrintSetup.A4_PAPERSIZE);
                ps.setFitWidth((short) 1);
                ps.setFitHeight((short) 0);
                sheet.setFitToPage(true);
                sheet.setAutobreaks(true);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Crée un fichier Excel simple avec données en tableau
     *
     * @param title
     * @param headers
     * @param data
     *
     * @return
     *
     * @throws java.io.IOException
     */
    public byte[] createSimpleExcelReport(String title, String[] headers, List<String[]> data) throws IOException {
        return createExcelReport(title, headers, data, (row, rowData) -> {
            for (int i = 0; i < rowData.length; i++) {
                Cell cell = row.createCell(i);
                cell.setCellValue(rowData[i]);
            }
        });
    }

    /**
     * Export Excel de la valorisation du stock : meme contenu que l'impression PDF — detail par element (modes Famille
     * / Emplacement / Grossiste) puis eclatement par TVA ; en mode Simple, valeurs globales et eclatement par TVA avec
     * le prix moyen pondere.
     *
     * @param title
     *            Titre (identique a l'entete du PDF)
     * @param valorisation
     *            Resultat de la valorisation (detail dans getDatas(), TVA dans getTvas())
     * @param avecDetail
     *            true pour les modes Famille / Emplacement / Grossiste, false pour le mode Simple
     *
     * @return ByteArray du fichier Excel
     *
     * @throws java.io.IOException
     */
    public byte[] createValorisationExcel(String title, ValorisationDTO valorisation, boolean avecDetail)
            throws IOException {

        try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sanitizeSheetName("Valorisation"));

            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            DataFormat format = workbook.createDataFormat();
            CellStyle montantStyle = workbook.createCellStyle();
            montantStyle.setDataFormat(format.getFormat("#,##0"));
            montantStyle.setAlignment(HorizontalAlignment.RIGHT);

            Font boldFont = workbook.createFont();
            boldFont.setBold(true);
            CellStyle totalLabelStyle = workbook.createCellStyle();
            totalLabelStyle.setFont(boldFont);
            CellStyle totalMontantStyle = workbook.createCellStyle();
            totalMontantStyle.setDataFormat(format.getFormat("#,##0"));
            totalMontantStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalMontantStyle.setFont(boldFont);

            CellStyle pourcentStyle = workbook.createCellStyle();
            pourcentStyle.setDataFormat(format.getFormat("#,##0.0 \"%\""));
            pourcentStyle.setAlignment(HorizontalAlignment.RIGHT);
            CellStyle totalPourcentStyle = workbook.createCellStyle();
            totalPourcentStyle.setDataFormat(format.getFormat("#,##0.0 \"%\""));
            totalPourcentStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalPourcentStyle.setFont(boldFont);

            int nbCols = avecDetail ? 7 : 4;
            int rowNum = 0;

            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(title);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, nbCols - 1));

            Row dateRow = sheet.createRow(rowNum++);
            Cell dateCell = dateRow.createCell(0);
            dateCell.setCellValue("Généré le: " + LocalDateTime.now().format(DATETIME_FORMATTER));
            dateCell.setCellStyle(dateStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, nbCols - 1));

            rowNum++;

            double totalVente = valorisation.getMontantPu() == null ? 0d : valorisation.getMontantPu().doubleValue();
            double totalAchat = valorisation.getMontantFacture() == null ? 0d
                    : valorisation.getMontantFacture().doubleValue();

            // Bandeau d'indicateurs, comme les cartouches en tete du PDF
            Row venteRow = sheet.createRow(rowNum++);
            libelleValeur(venteRow, "VALEUR VENTE", valorisation.getMontantPu(), totalLabelStyle, totalMontantStyle);
            Row achatRow = sheet.createRow(rowNum++);
            libelleValeur(achatRow, "VALEUR ACHAT", valorisation.getMontantFacture(), totalLabelStyle,
                    totalMontantStyle);
            Row ecartRow = sheet.createRow(rowNum++);
            libelleValeur(ecartRow, "ÉCART", Double.valueOf(totalVente - totalAchat), totalLabelStyle,
                    totalMontantStyle);
            Row margeRow = sheet.createRow(rowNum++);
            Cell margeLabel = margeRow.createCell(0);
            margeLabel.setCellValue("MARGE");
            margeLabel.setCellStyle(totalLabelStyle);
            montantCell(margeRow, 1, Double.valueOf(pourcent(totalVente - totalAchat, totalVente)), totalPourcentStyle);
            rowNum++;

            if (avecDetail) {
                String[] heads = { "Code", "Libellé", "Prix de Vente", "% vente", "Prix d'Achat Facture", "% achat",
                        "Marge %" };
                Row headerRow = sheet.createRow(rowNum++);
                for (int i = 0; i < heads.length; i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(heads[i]);
                    cell.setCellStyle(headerStyle);
                }
                for (ValorisationDTO ligne : valorisation.getDatas()) {
                    double vente = ligne.getMontantPu() == null ? 0d : ligne.getMontantPu().doubleValue();
                    double achat = ligne.getMontantFacture() == null ? 0d : ligne.getMontantFacture().doubleValue();
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(ligne.getCode() != null ? ligne.getCode() : "");
                    row.createCell(1).setCellValue(ligne.getLibelle() != null ? ligne.getLibelle() : "");
                    montantCell(row, 2, ligne.getMontantPu(), montantStyle);
                    montantCell(row, 3, Double.valueOf(pourcent(vente, totalVente)), pourcentStyle);
                    montantCell(row, 4, ligne.getMontantFacture(), montantStyle);
                    montantCell(row, 5, Double.valueOf(pourcent(achat, totalAchat)), pourcentStyle);
                    montantCell(row, 6, Double.valueOf(pourcent(vente - achat, vente)), pourcentStyle);
                }
                Row totalRow = sheet.createRow(rowNum++);
                Cell totalLabel = totalRow.createCell(1);
                totalLabel.setCellValue("TOTAL");
                totalLabel.setCellStyle(totalLabelStyle);
                montantCell(totalRow, 2, valorisation.getMontantPu(), totalMontantStyle);
                montantCell(totalRow, 3, Double.valueOf(totalVente == 0d ? 0d : 100d), totalPourcentStyle);
                montantCell(totalRow, 4, valorisation.getMontantFacture(), totalMontantStyle);
                montantCell(totalRow, 5, Double.valueOf(totalAchat == 0d ? 0d : 100d), totalPourcentStyle);
                montantCell(totalRow, 6, Double.valueOf(pourcent(totalVente - totalAchat, totalVente)),
                        totalPourcentStyle);
                rowNum++;
            }

            // Eclatement par TVA (le prix moyen pondere n'apparait qu'en mode Simple, comme sur le PDF)
            String[] headsTva = avecDetail
                    ? new String[] { "Eclatement par TVA", "Prix de Vente", "Prix d'Achat Facture" } : new String[] {
                            "Eclatement par TVA", "Prix de Vente", "Prix d'Achat Facture", "Prix moyen pondéré" };
            Row headerTvaRow = sheet.createRow(rowNum++);
            for (int i = 0; i < headsTva.length; i++) {
                Cell cell = headerTvaRow.createCell(i);
                cell.setCellValue(headsTva[i]);
                cell.setCellStyle(headerStyle);
            }
            ValorisationDTO tva = valorisation.getTvas();
            if (tva != null) {
                for (ValorisationDTO ligne : tva.getDatas()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(ligne.getLibelle() != null ? ligne.getLibelle() : "");
                    montantCell(row, 1, ligne.getMontantPu(), montantStyle);
                    montantCell(row, 2, ligne.getMontantFacture(), montantStyle);
                    if (!avecDetail) {
                        montantCell(row, 3, ligne.getMontantPmd(), montantStyle);
                    }
                }
                Row totalTvaRow = sheet.createRow(rowNum++);
                Cell totalTvaLabel = totalTvaRow.createCell(0);
                totalTvaLabel.setCellValue("TOTAL GENERAL");
                totalTvaLabel.setCellStyle(totalLabelStyle);
                montantCell(totalTvaRow, 1, tva.getMontantPu(), totalMontantStyle);
                montantCell(totalTvaRow, 2, tva.getMontantFacture(), totalMontantStyle);
                if (!avecDetail) {
                    montantCell(totalTvaRow, 3, tva.getMontantPmd(), totalMontantStyle);
                }
            }

            for (int i = 0; i < nbCols; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void libelleValeur(Row row, String libelle, Number valeur, CellStyle labelStyle, CellStyle valeurStyle) {
        Cell label = row.createCell(0);
        label.setCellValue(libelle);
        label.setCellStyle(labelStyle);
        montantCell(row, 1, valeur, valeurStyle);
    }

    /** Pourcentage sur 100, 0 si le denominateur est nul. */
    private double pourcent(double valeur, double total) {
        return total == 0d ? 0d : valeur * 100d / total;
    }

    private void montantCell(Row row, int col, Number valeur, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(valeur != null ? valeur.doubleValue() : 0d);
        cell.setCellStyle(style);
    }

    // Styles
    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        font.setColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setFontHeightInPoints((short) 10);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    // Utilitaires
    private String sanitizeSheetName(String name) {
        // Les noms de feuilles Excel ne peuvent pas contenir : \ / ? * [ ]
        return name.replaceAll("[:\\\\/?*\\[\\]]", "_").substring(0, Math.min(name.length(), 31));
    }

    /**
     * Formate un nombre avec 2 décimales
     */
    public String formatNumber(Number value) {
        if (value == null) {
            return "0.00";
        }
        return String.format("%.2f", value.doubleValue());
    }

    /**
     * Formate une date
     */
    public String formatDate(LocalDateTime date) {
        if (date == null) {
            return "";
        }
        return date.format(DATE_FORMATTER);
    }
}
