package rest.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.inject.Inject;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import rest.service.AnalyseInvExportService;
import rest.service.AnalyseInvService;
import rest.service.dto.AnalyseInvDTO;
import util.Constant;

@Stateless
public class AnalyseInvExportServiceImpl implements AnalyseInvExportService {

    private static final Logger LOG = Logger.getLogger(AnalyseInvExportServiceImpl.class.getName());

    @Inject
    private AnalyseInvService analyseInvService;

    private static class EnhancedExportData {
        final List<Map<String, Object>> detailData;
        final String complianceReport;
        final Map<String, Object> summary;
        final List<Map<String, Object>> topDiscrepancies;

        EnhancedExportData(List<Map<String, Object>> detailData, String complianceReport, Map<String, Object> summary,
                List<Map<String, Object>> topDiscrepancies) {
            this.detailData = detailData;
            this.complianceReport = complianceReport;
            this.summary = summary;
            this.topDiscrepancies = topDiscrepancies;
        }
    }

    @Override
    public byte[] generatePdfReport(String inventaireId, String filterType) throws JRException {
        List<AnalyseInvDTO> rawData = analyseInvService.analyseInventaire(inventaireId);
        EnhancedExportData exportData = processDataForExport(rawData, filterType);

        File reportFile = new File(Constant.REPORT_PATH + "analyse_inventaire.jrxml");
        if (!reportFile.exists()) {
            throw new JRException("Jasper report file not found at: " + reportFile.getAbsolutePath());
        }

        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(exportData.detailData);

        Map<String, Object> parameters = new HashMap<>();
        String inventaireName = rawData.isEmpty() ? "" : rawData.get(0).getInvName();
        parameters.put("INVENTAIRE_NAME", inventaireName);
        parameters.put("DATE_RAPPORT", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")));
        parameters.put("COMPLIANCE_REPORT", exportData.complianceReport);

        parameters.put("ECART_GLOBAL_NET", exportData.summary.get("ecartGlobalNet"));
        parameters.put("DEMARQUE_PCT", exportData.summary.get("demarquePct"));
        parameters.put("EMPLACEMENT_CRITIQUE_1", exportData.summary.get("emplacementCritique_1"));
        parameters.put("EMPLACEMENT_CRITIQUE_2", exportData.summary.get("emplacementCritique_2"));
        parameters.put("EMPLACEMENT_CRITIQUE_3", exportData.summary.get("emplacementCritique_3"));
        parameters.put("EMPLACEMENT_FAIBLE_MARGE", exportData.summary.get("emplacementFaibleMarge"));

        parameters.put("TOP_DISCREPANCIES_DS", new JRBeanCollectionDataSource(exportData.topDiscrepancies));

        JasperReport jasperReport = JasperCompileManager.compileReport(reportFile.getAbsolutePath());
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            JRPdfExporter exporter = new JRPdfExporter();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(baos));
            exporter.exportReport();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new JRException("Error writing PDF to byte array", e);
        }
    }

    @Override
    public byte[] generateExcelReport(String inventaireId, String filterType) throws IOException {
        List<AnalyseInvDTO> rawData = analyseInvService.analyseInventaire(inventaireId);
        EnhancedExportData exportData = processDataForExport(rawData, filterType);

        try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            String inventaireName = rawData.isEmpty() ? "" : rawData.get(0).getInvName();
            Sheet sheet = workbook.createSheet("Analyse Inventaire " + inventaireName);

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);

            String[] headers = { "Emplacement", "V.Achat Machine", "V.Achat Inventaire", "Écart V.Achat",
                    "V.Vente Machine", "V.Vente Inventaire", "Écart V.Vente", "% Écart Global", "Ratio V/A" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerCellStyle);
            }

            int rowNum = 1;
            for (Map<String, Object> rowData : exportData.detailData) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(String.valueOf(rowData.get("emplacement")));
                row.createCell(1).setCellValue(asDouble(rowData.get("valeurAchatMachine")));
                row.createCell(2).setCellValue(asDouble(rowData.get("valeurAchatRayon")));
                row.createCell(3).setCellValue(asDouble(rowData.get("ecartValeurAchat")));
                row.createCell(4).setCellValue(asDouble(rowData.get("valeurVenteMachine")));
                row.createCell(5).setCellValue(asDouble(rowData.get("valeurVenteRayon")));
                row.createCell(6).setCellValue(asDouble(rowData.get("ecartValeurVente")));
                row.createCell(7).setCellValue(asDouble(rowData.get("pourcentageEcartGlobal")));
                row.createCell(8).setCellValue(asDouble(rowData.get("ratioVA")));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    private EnhancedExportData processDataForExport(List<AnalyseInvDTO> rawData, String filterType) {
        Map<String, Map<String, Double>> emplacementTotals = new HashMap<>();

        long modifiedProducts = rawData.stream().filter(dto -> !dto.getQteSaisie().equals(dto.getQteInitiale()))
                .count();
        long totalProducts = rawData.size();
        double percentage = (totalProducts == 0) ? 0.0 : ((double) modifiedProducts / totalProducts) * 100;
        DecimalFormat df = new DecimalFormat("#.00");
        String complianceReport = String.format(
                "Rapport de conformité : %d produit(s) modifié(s) sur %d au total (%s %%)", modifiedProducts,
                totalProducts, df.format(percentage).replace(",", "."));

        for (AnalyseInvDTO dto : rawData) {
            String loc = (dto.getEmplacement() != null && !dto.getEmplacement().isEmpty()) ? dto.getEmplacement()
                    : "Non défini";
            emplacementTotals.putIfAbsent(loc, new HashMap<>());
            Map<String, Double> totals = emplacementTotals.get(loc);

            totals.merge("valeurAchatMachine", dto.getQteInitiale() * dto.getPrixAchat(), Double::sum);
            totals.merge("valeurAchatRayon", dto.getQteSaisie() * dto.getPrixAchat(), Double::sum);
            totals.merge("valeurVenteMachine", dto.getQteInitiale() * dto.getPrixVente(), Double::sum);
            totals.merge("valeurVenteRayon", dto.getQteSaisie() * dto.getPrixVente(), Double::sum);
        }

        double totalEcartAchatAbsolu = 0;
        for (Map<String, Double> totals : emplacementTotals.values()) {
            double ecartAchat = totals.getOrDefault("valeurAchatRayon", 0.0)
                    - totals.getOrDefault("valeurAchatMachine", 0.0);
            totalEcartAchatAbsolu += Math.abs(ecartAchat);
        }

        List<Map<String, Object>> summaryData = new ArrayList<>();
        for (Map.Entry<String, Map<String, Double>> entry : emplacementTotals.entrySet()) {
            Map<String, Object> rowData = new HashMap<>();
            Map<String, Double> totals = entry.getValue();

            double valeurAchatMachine = totals.getOrDefault("valeurAchatMachine", 0.0);
            double valeurAchatRayon = totals.getOrDefault("valeurAchatRayon", 0.0);
            double ecartAchat = valeurAchatRayon - valeurAchatMachine;
            double ratioVA = (valeurAchatRayon != 0) ? (totals.getOrDefault("valeurVenteRayon", 0.0) / valeurAchatRayon)
                    : 0;

            rowData.put("emplacement", entry.getKey());
            rowData.put("valeurAchatMachine", valeurAchatMachine);
            rowData.put("valeurAchatRayon", valeurAchatRayon);
            rowData.put("ecartValeurAchat", ecartAchat);
            rowData.put("valeurVenteMachine", totals.getOrDefault("valeurVenteMachine", 0.0));
            rowData.put("valeurVenteRayon", totals.getOrDefault("valeurVenteRayon", 0.0));
            rowData.put("ecartValeurVente",
                    totals.getOrDefault("valeurVenteRayon", 0.0) - totals.getOrDefault("valeurVenteMachine", 0.0));
            rowData.put("pourcentageEcartGlobal",
                    (totalEcartAchatAbsolu != 0) ? (Math.abs(ecartAchat) / totalEcartAchatAbsolu) * 100 : 0);
            rowData.put("ratioVA", ratioVA);

            summaryData.add(rowData);
        }

        summaryData.sort(Comparator.comparing(m -> (String) m.get("emplacement")));

        Map<String, Object> globalSummary = new HashMap<>();
        DecimalFormat moneyFormat = new DecimalFormat("#,##0 'FCFA'");
        double totalValeurAchatMachine = summaryData.stream().mapToDouble(m -> (double) m.get("valeurAchatMachine"))
                .sum();
        double totalEcartNet = summaryData.stream().mapToDouble(m -> (double) m.get("ecartValeurAchat")).sum();
        globalSummary.put("ecartGlobalNet", moneyFormat.format(totalEcartNet));
        globalSummary.put("demarquePct",
                String.format("%.2f %%",
                        (totalValeurAchatMachine == 0) ? 0 : (totalEcartNet / totalValeurAchatMachine) * 100)
                        .replace(",", "."));

        /* emplacements avec gros ecarts */
        List<Map<String, Object>> top3Critiques = summaryData.stream()
                .sorted(Comparator
                        .comparingDouble((Map<String, Object> m) -> Math.abs((double) m.get("ecartValeurAchat")))
                        .reversed())
                .limit(3).collect(Collectors.toList());

        globalSummary.put("emplacementCritique_1",
                top3Critiques.size() > 0 ? top3Critiques.get(0).get("emplacement") : "N/A");
        globalSummary.put("emplacementCritique_2",
                top3Critiques.size() > 1 ? top3Critiques.get(1).get("emplacement") : "");
        globalSummary.put("emplacementCritique_3",
                top3Critiques.size() > 2 ? top3Critiques.get(2).get("emplacement") : "");

        summaryData.stream().filter((Map<String, Object> m) -> (double) m.get("ratioVA") > 0)
                .min(Comparator.comparingDouble((Map<String, Object> m) -> (double) m.get("ratioVA")))
                .ifPresent(m -> globalSummary.put("emplacementFaibleMarge",
                        String.format("%s (%.2f)", m.get("emplacement"), m.get("ratioVA"))));

        // Top 5 produits ecarts
        List<Map<String, Object>> topDiscrepancies = rawData.stream().map(dto -> {
            Map<String, Object> item = new HashMap<>();
            double ecartVal = (dto.getQteSaisie() - dto.getQteInitiale()) * dto.getPrixAchat();
            item.put("nom", dto.getNom());
            item.put("ecartVal", moneyFormat.format(ecartVal)); // Utilisation du formateur
            item.put("ecartAbs", Math.abs(ecartVal));
            return item;
        }).filter(m -> (double) m.get("ecartAbs") > 0)
                .sorted(Comparator.comparingDouble((Map<String, Object> m) -> (double) m.get("ecartAbs")).reversed())
                .limit(5).collect(Collectors.toList());

        // filtre
        List<Map<String, Object>> filteredData = summaryData;
        if (filterType != null && !filterType.equalsIgnoreCase("all")) {
            final String finalFilterType = filterType;
            filteredData = summaryData.stream().filter(row -> {
                double ecart = (double) row.get("ecartValeurAchat");
                if (finalFilterType.equalsIgnoreCase("with"))
                    return ecart != 0;
                if (finalFilterType.equalsIgnoreCase("without"))
                    return ecart == 0;
                return true;
            }).collect(Collectors.toList());
        }

        return new EnhancedExportData(filteredData, complianceReport, globalSummary, topDiscrepancies);
    }

    @Override
    public byte[] generateAdvancedExcelReport(String inventaireId) throws IOException {
        Map<String, Object> advancedData = analyseInvService.getAnalyseAvanceeData(inventaireId);
        String inventaireName = analyseInvService.analyseInventaire(inventaireId).stream().findFirst()
                .map(AnalyseInvDTO::getInvName).orElse("");

        try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);

            // Sheet 1: Synthèse par Emplacement
            createSheetForSummary(workbook, "Synthèse par Emplacement", headerCellStyle,
                    (List<Map<String, Object>>) advancedData.get("summaryData"));

            // Sheet 2: Analyse ABC
            createSheetForAbc(workbook, "Analyse ABC", headerCellStyle,
                    (List<Map<String, Object>>) advancedData.get("abcData"));

            // Sheet 3: Détail des produits
            createSheetForDetails(workbook, "Détail Produits", headerCellStyle,
                    (List<Map<String, Object>>) advancedData.get("detailData"));

            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    private void createSheetForSummary(Workbook workbook, String sheetName, CellStyle headerCellStyle,
            List<Map<String, Object>> data) {
        Sheet sheet = workbook.createSheet(sheetName);
        String[] headers = { "Emplacement", "V.Achat Inventaire", "Écart V.Achat", "Contribution à l'Écart",
                "Ratio V/A" };
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerCellStyle);
        }

        int rowNum = 1;
        for (Map<String, Object> rowData : data) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(String.valueOf(rowData.get("emplacement")));
            row.createCell(1).setCellValue(asDouble(rowData.get("valeurAchatRayon")));
            row.createCell(2).setCellValue(asDouble(rowData.get("ecartValeurAchat")));
            row.createCell(3).setCellValue(asDouble(rowData.get("pourcentageEcartGlobal")));
            row.createCell(4).setCellValue(asDouble(rowData.get("ratioVA")));
        }
        for (int i = 0; i < headers.length; i++)
            sheet.autoSizeColumn(i);
    }

    private void createSheetForAbc(Workbook workbook, String sheetName, CellStyle headerCellStyle,
            List<Map<String, Object>> data) {
        Sheet sheet = workbook.createSheet(sheetName);
        String[] headers = { "Produit", "Écart Valeur Achat", "% Écart Total", "% Cumulé", "Catégorie" };
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerCellStyle);
        }
        int rowNum = 1;
        for (Map<String, Object> rowData : data) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(String.valueOf(rowData.get("nom")));
            row.createCell(1).setCellValue(asDouble(rowData.get("ecartValeurAchat")));
            row.createCell(2).setCellValue(asDouble(rowData.get("ecartTotalPct")));
            row.createCell(3).setCellValue(asDouble(rowData.get("cumulPct")));
            row.createCell(4).setCellValue(String.valueOf(rowData.get("categorie")));
        }
        for (int i = 0; i < headers.length; i++)
            sheet.autoSizeColumn(i);
    }

    private void createSheetForDetails(Workbook workbook, String sheetName, CellStyle headerCellStyle,
            List<Map<String, Object>> data) {
        Sheet sheet = workbook.createSheet(sheetName);
        String[] headers = { "Produit", "Emplacement", "Qté Machine", "Qté Rayon", "Écart Qté", "Prix Achat",
                "Prix Vente", "Ratio V/A" };
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerCellStyle);
        }
        int rowNum = 1;
        for (Map<String, Object> rowData : data) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(String.valueOf(rowData.get("nom")));
            row.createCell(1).setCellValue(String.valueOf(rowData.get("emplacement")));
            row.createCell(2).setCellValue(asDouble(rowData.get("qteInitiale")));
            row.createCell(3).setCellValue(asDouble(rowData.get("qteSaisie")));
            row.createCell(4).setCellValue(asDouble(rowData.get("ecartQte")));
            row.createCell(5).setCellValue(asDouble(rowData.get("prixAchat")));
            row.createCell(6).setCellValue(asDouble(rowData.get("prixVente")));
            row.createCell(7).setCellValue(asDouble(rowData.get("ratioVA")));
        }
        for (int i = 0; i < headers.length; i++)
            sheet.autoSizeColumn(i);
    }

    private double asDouble(Object o) {
        if (o instanceof Number) {
            return ((Number) o).doubleValue();
        }
        return 0.0;
    }
}
