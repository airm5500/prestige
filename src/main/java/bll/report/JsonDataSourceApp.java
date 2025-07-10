/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.report;

import dal.TFacture;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperPrintManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JsonDataSource;
import net.sf.jasperreports.engine.export.JRCsvExporter;
import net.sf.jasperreports.engine.export.JRRtfExporter;
import net.sf.jasperreports.engine.export.JRXlsExporter;
import net.sf.jasperreports.engine.export.oasis.JROdsExporter;
import net.sf.jasperreports.engine.export.oasis.JROdtExporter;
import net.sf.jasperreports.engine.export.ooxml.JRDocxExporter;
import net.sf.jasperreports.engine.export.ooxml.JRPptxExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.engine.query.JsonQueryExecuterFactory;
import net.sf.jasperreports.engine.util.AbstractSampleApp;
import net.sf.jasperreports.engine.util.JRLoader;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOdsReportConfiguration;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimpleWriterExporterOutput;
import net.sf.jasperreports.export.SimpleXlsReportConfiguration;
import net.sf.jasperreports.export.SimpleXlsxReportConfiguration;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.utils.jdom;

/**
 *
 * @author KKOFFI
 */
public class JsonDataSourceApp extends AbstractSampleApp {

    DateFormat DATEFORMAT = new SimpleDateFormat("HH_mm_ss");
    private String reportpath = "";
    private String reportLogo = "";

    public String getReportpath() {
        return reportpath;
    }

    public void setReportpath(String reportpath) {
        this.reportpath = reportpath;
    }

    public String getReportLogo() {
        return reportLogo;
    }

    public void setReportLogo(String reportLogo) {
        this.reportLogo = reportLogo;
    }

    public static void main(String[] args) {
        try {
            // main(new JsonDataSourceApp(), args);//71011175771271903909
            JsonDataSourceApp app = new JsonDataSourceApp();
            app.test();
        } catch (JRException ex) {
            Logger.getLogger(JsonDataSourceApp.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void fill(String idInvoice) throws JRException {
        try {
            JSONObject json = ReportDataSource.generateJSON(idInvoice);
            JSONObject data = json.getJSONObject("invoice");
            long start = System.currentTimeMillis();

            Map<String, Object> params = ReportDataSource.getParametters(idInvoice);
            String TPSHORTNAME = json.getString("TPSHORTNAME");
            String seconLabel = json.getString("seconLabel");

            // params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            // params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            InputStream iostream = new ByteArrayInputStream(data.toString().getBytes(StandardCharsets.UTF_8));
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, iostream);
            params.put("TPSHORTNAME", TPSHORTNAME);
            params.put("seconLabel", seconLabel);
            JasperFillManager.fillReportToFile(jdom.scr_report_file + "rp_vieillemere.jasper", params);
            System.err.println("Filling time : " + (System.currentTimeMillis() - start));
        } catch (JSONException ex) {
            Logger.getLogger(JsonDataSourceApp.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void test() throws JRException {
        // fill("71011175771271903909");
        // fill();
        // pdf();
        exTopdf();
        xlsx();
        docx();
        rtf();

        // print();
        /*
         * xmlEmbed(); xml(); html(); rtf(); xls(); csv(); odt(); ods(); docx(); xlsx(); pptx();
         */
    }

    /**
     *
     * @throws net.sf.jasperreports.engine.JRException
     */
    public void fill() throws JRException {
        try {
            JsonDataSource dataSource = new JsonDataSource(new File("D:\\invoice.json"));
            long start = System.currentTimeMillis();
            Map<String, Object> params = new HashMap<>();
            params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, new FileInputStream(new File("D:\\invoice.json")));
            // params.put(JSon, Locale.FRANCE);
            JasperFillManager.fillReportToFile(jdom.scr_report_file + "rp_vieillemere.jasper", params);
            System.err.println("Filling time : " + (System.currentTimeMillis() - start));
        } catch (FileNotFoundException ex) {
            Logger.getLogger(JsonDataSourceApp.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    /**
     *
     * @throws net.sf.jasperreports.engine.JRException
     */
    public void print() throws JRException {
        long start = System.currentTimeMillis();
        JasperPrintManager.printReport(jdom.scr_report_file + "rp_vieillemere.jrprint", true);
        System.err.println("Printing time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void pdf() throws JRException {
        long start = System.currentTimeMillis();
        JasperExportManager.exportReportToPdfFile(jdom.scr_report_file + "rp_complementaire.jrprint",
                jdom.scr_report_pdf + "facturecomplementaire_" + DATEFORMAT.format(new Date()) + ".pdf");
        System.err.println("PDF creation time : " + (System.currentTimeMillis() - start));
    }

    public String exTopdf() throws JRException {

        String fileName = "facturecomplementaire_" + DATEFORMAT.format(new Date()) + ".pdf";
        long start = System.currentTimeMillis();
        String pathName = jdom.scr_report_pdf + fileName;
        JasperExportManager.exportReportToPdfFile(jdom.scr_report_file + "rp_complementaire.jrprint", pathName);
        System.err.println("PDF creation time : " + (System.currentTimeMillis() - start));
        return pathName;
    }

    public String exTopdf(String scr_report_file, String pathName) throws JRException {
        // String fileName = facturecomplementaire_" + DATEFORMAT.format(new Date()) + ".pdf";
        long start = System.currentTimeMillis();
        // String pathName = jdom.scr_report_pdf + fileName;
        // JasperExportManager.exportReportToPdfFile(jdom.scr_report_file + "rp_complementaire.jrprint", pathName);
        JasperExportManager.exportReportToPdfFile(scr_report_file, pathName);
        System.err.println("PDF creation time : " + (System.currentTimeMillis() - start));
        return pathName;
    }

    /**
     *
     * @throws net.sf.jasperreports.engine.JRException
     */
    public void rtf() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".rtf");

        JRRtfExporter exporter = new JRRtfExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleWriterExporterOutput(destFile));

        exporter.exportReport();

        System.err.println("RTF creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     * @throws net.sf.jasperreports.engine.JRException
     */
    public void xml() throws JRException {
        long start = System.currentTimeMillis();
        JasperExportManager.exportReportToXmlFile(jdom.scr_report_file + "rp_vieillemere.jrprint", false);
        System.err.println("XML creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void xmlEmbed() throws JRException {
        long start = System.currentTimeMillis();
        JasperExportManager.exportReportToXmlFile(jdom.scr_report_file + "rp_vieillemere.jrprint", true);
        System.err.println("XML creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void html() throws JRException {
        long start = System.currentTimeMillis();
        JasperExportManager.exportReportToHtmlFile(jdom.scr_report_file + "rp_vieillemere.jrprint");
        System.err.println("HTML creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void xls() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".xls");

        JRXlsExporter exporter = new JRXlsExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(destFile));
        SimpleXlsReportConfiguration configuration = new SimpleXlsReportConfiguration();
        configuration.setOnePagePerSheet(true);
        exporter.setConfiguration(configuration);

        exporter.exportReport();

        System.err.println("XLS creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void csv() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".csv");

        JRCsvExporter exporter = new JRCsvExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleWriterExporterOutput(destFile));
        // exporter.setParameter(JRCsvExporterParameter.FIELD_DELIMITER, "|");

        exporter.exportReport();

        System.err.println("CSV creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void odt() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".odt");

        JROdtExporter exporter = new JROdtExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(destFile));

        exporter.exportReport();

        System.err.println("ODT creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void ods() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".ods");

        JROdsExporter exporter = new JROdsExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(destFile));
        SimpleOdsReportConfiguration configuration = new SimpleOdsReportConfiguration();
        configuration.setOnePagePerSheet(true);
        exporter.setConfiguration(configuration);

        exporter.exportReport();

        System.err.println("ODS creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void docx() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        // File destFile = new File(jdom.scr_report_pdf+"facturecomplementaire_" +DATEFORMAT.format(new Date())+
        // ".docx");
        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".docx");
        JRDocxExporter exporter = new JRDocxExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(destFile));

        exporter.exportReport();

        System.err.println("DOCX creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void xlsx() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        // File destFile = new File(jdom.scr_report_pdf+"facturecomplementaire_" +DATEFORMAT.format(new Date()) +
        // ".xlsx");
        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".xlsx");
        JRXlsxExporter exporter = new JRXlsxExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(destFile));
        SimpleXlsxReportConfiguration configuration = new SimpleXlsxReportConfiguration();
        configuration.setOnePagePerSheet(true);
        exporter.setConfiguration(configuration);

        exporter.exportReport();

        System.err.println("XLSX creation time : " + (System.currentTimeMillis() - start));
    }

    /**
     *
     */
    public void pptx() throws JRException {
        long start = System.currentTimeMillis();
        File sourceFile = new File(jdom.scr_report_file + "rp_vieillemere.jrprint");

        JasperPrint jasperPrint = (JasperPrint) JRLoader.loadObject(sourceFile);

        File destFile = new File(sourceFile.getParent(), jasperPrint.getName() + ".pptx");

        JRPptxExporter exporter = new JRPptxExporter();

        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(destFile));

        exporter.exportReport();

        System.err.println("PPTX creation time : " + (System.currentTimeMillis() - start));
    }

    public String fill(TFacture idInvoice, Map<String, Object> params) throws JRException {
        String fileName = "facturecomplementaire_" + DATEFORMAT.format(new Date()) + ".pdf";
        String pathName = "";
        try {
            JSONObject json = ReportDataSource.generateJSON(idInvoice);
            JSONObject data = json.getJSONObject("invoice");
            long start = System.currentTimeMillis();

            String TPSHORTNAME = json.getString("TPSHORTNAME");
            String seconLabel = json.getString("seconLabel");

            params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            // params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            InputStream iostream = new ByteArrayInputStream(data.toString().getBytes(StandardCharsets.UTF_8));
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, iostream);
            params.put("TPSHORTNAME", TPSHORTNAME);
            params.put("seconLabel", seconLabel);

            pathName = jdom.scr_report_pdf + fileName;
            // JasperFillManager.fillReportToFile(jdom.scr_report_file + "rp_complementaire.jasper", params);
            JasperReport jasperReport = JasperCompileManager
                    .compileReport(jdom.scr_report_file + "rp_complementaire.jrxml");
            // JasperFillManager.fillReportToFile( jdom.scr_report_file+ "rp_vieillemere.jasper", params);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params);
            JasperExportManager.exportReportToPdfFile(jasperPrint, pathName);

        } catch (JSONException ex) {
            Logger.getLogger(JsonDataSourceApp.class.getName()).log(Level.SEVERE, null, ex);
        }
        return pathName;
    }

    public void fill(String idInvoice, Map<String, Object> params) throws JRException {
        try {
            JSONObject json = ReportDataSource.generateJSON(idInvoice);
            JSONObject data = json.getJSONObject("invoice");
            long start = System.currentTimeMillis();

            // Map<String, Object> params = ReportDataSource.getParametters(idInvoice);
            String TPSHORTNAME = json.getString("TPSHORTNAME");
            String seconLabel = json.getString("seconLabel");

            params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            // params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            InputStream iostream = new ByteArrayInputStream(data.toString().getBytes(StandardCharsets.UTF_8));
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, iostream);
            params.put("TPSHORTNAME", TPSHORTNAME);
            params.put("seconLabel", seconLabel);

            JasperFillManager.fillReportToFile(jdom.scr_report_file + "rp_complementaire.jasper", params);
            // JasperFillManager.fillReportToFile( jdom.scr_report_file+ "rp_vieillemere.jasper", params);

            System.err.println("Filling time : " + (System.currentTimeMillis() - start));
        } catch (JSONException ex) {
            Logger.getLogger(JsonDataSourceApp.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public String fill(Map<String, Object> params, JSONObject json, String scr_report_file, String fileName)
            throws JRException {
        String pathName;
        try {
            long start = System.currentTimeMillis();
            params.put(JsonQueryExecuterFactory.JSON_DATE_PATTERN, "yyyy-MM-dd");
            // params.put(JsonQueryExecuterFactory.JSON_NUMBER_PATTERN, "#,##0.##");
            params.put(JsonQueryExecuterFactory.JSON_LOCALE, Locale.FRANCE);
            params.put(JRParameter.REPORT_LOCALE, Locale.FRANCE);
            InputStream iostream = new ByteArrayInputStream(json.toString().getBytes(StandardCharsets.UTF_8));
            params.put(JsonQueryExecuterFactory.JSON_INPUT_STREAM, iostream);
            JasperReport jasperReport = JasperCompileManager.compileReport(scr_report_file);
            pathName = jdom.scr_report_pdf + fileName;
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params);
            JasperExportManager.exportReportToPdfFile(jasperPrint, pathName);
            // JasperFillManager.fillReportToFile(scr_report_file, params);

            System.err.println("Filling time : " + (System.currentTimeMillis() - start));
        } catch (Exception ex) {
            Logger.getLogger(JsonDataSourceApp.class.getName()).log(Level.SEVERE, null, ex);
        }
        return fileName;
    }

}
