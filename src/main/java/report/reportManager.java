/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package report;

import java.io.File;
import java.util.Map;

import dal.jconnexion;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRExporterParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.JasperRunManager;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.export.JRXlsExporter;
import net.sf.jasperreports.engine.export.JRXlsExporterParameter;
import net.sf.jasperreports.engine.xml.JRXmlLoader;
import toolkits.utils.logger;

/**
 *
 * @author Thierry
 */
public class reportManager {

    private jconnexion ojconnexion;
    private String Path_report_src;
    private String Path_report_pdf;
    private String Path_report_XLS;

    public void loadConnexion(jconnexion ojconnexion) {
        this.setOjconnexion(ojconnexion);

    }

    public reportManager() {
        if (ojconnexion == null) {
            ojconnexion = new jconnexion();
        }
    }

    public void BuildReport(Map parameters) {
        try {

            getOjconnexion().initConnexion();
            getOjconnexion().OpenConnexion();

            JasperDesign jasperDesign = JRXmlLoader.load(this.getPath_report_src());
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);
            //

            // - Execution du rapport
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                    getOjconnexion().get_StringConnexion());
            //
            JasperExportManager.exportReportToPdfFile(jasperPrint, this.getPath_report_pdf());

        } catch (JRException e) {
            e.printStackTrace();

        }

        getOjconnexion().CloseConnexion();
    }

    public void BuildReport(Map parameters, jconnexion Ojconnexion) {
        try {

            JasperDesign jasperDesign = JRXmlLoader.load(this.getPath_report_src());
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);
            // - Paramètres à envoyer au rapport

            // - Execution du rapport
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                    Ojconnexion.get_StringConnexion());
            // - Création du rapport au format PDF
            JasperExportManager.exportReportToPdfFile(jasperPrint, this.getPath_report_pdf());

        } catch (JRException e) {
            e.printStackTrace();

        }

        getOjconnexion().CloseConnexion();
    }

    public void CompileSubreport(Map parameters, jconnexion Ojconnexion, String path_subreport_src) {
        try {

            JasperDesign jasperDesign = JRXmlLoader.load(path_subreport_src);
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);
            // - Paramètres à envoyer au rapport

            // - Execution du rapport
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                    Ojconnexion.get_StringConnexion());
            // - Création du rapport au format PDF
            // JasperExportManager.exportReportToPdfFile(jasperPrint, this.getPath_report_pdf());

        } catch (JRException e) {
            e.printStackTrace();

        }

        getOjconnexion().CloseConnexion();
    }

    public void BuildReportPDF(Map parameters) {
        try {

            getOjconnexion().initConnexion();
            getOjconnexion().OpenConnexion();

            JasperDesign jasperDesign = JRXmlLoader.load(this.getPath_report_src());
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);
            // - Paramètres à envoyer au rapport

            // - Execution du rapport
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                    getOjconnexion().get_StringConnexion());
            // - Création du rapport au format PDF
            JasperExportManager.exportReportToPdfFile(jasperPrint, this.getPath_report_pdf());

        } catch (JRException e) {
            e.printStackTrace();

        }

        getOjconnexion().CloseConnexion();
    }

    public void BuildReportPDF(Map parameters, jconnexion Ojconnexion) {
        try {

            JasperDesign jasperDesign = JRXmlLoader.load(this.getPath_report_src());
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);
            // - Paramètres à envoyer au rapport

            // - Execution du rapport
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                    Ojconnexion.get_StringConnexion());
            // - Création du rapport au format PDF
            JasperExportManager.exportReportToPdfFile(jasperPrint, this.getPath_report_pdf());

        } catch (JRException e) {
            e.printStackTrace();

        }

        getOjconnexion().CloseConnexion();
    }

    public void BuildReportXLS(Map parameters) {
        try {

            getOjconnexion().initConnexion();
            getOjconnexion().OpenConnexion();

            File reportFile = new File(this.getPath_report_src());
            String path = reportFile.getAbsolutePath();

            JasperPrint jasperPrint = JasperFillManager.fillReport(path, parameters,
                    getOjconnexion().get_StringConnexion());
            String result = JasperRunManager.runReportToHtmlFile(this.getPath_report_src(), parameters,
                    getOjconnexion().get_StringConnexion());
            File destFile = new File(this.getPath_report_XLS());
            JRXlsExporter exporter = new JRXlsExporter();
            exporter.setParameter(JRExporterParameter.JASPER_PRINT, jasperPrint);
            exporter.setParameter(JRExporterParameter.OUTPUT_FILE_NAME, destFile.toString());
            exporter.setParameter(JRXlsExporterParameter.IS_ONE_PAGE_PER_SHEET, Boolean.TRUE);
            exporter.setParameter(JRXlsExporterParameter.IS_DETECT_CELL_TYPE, Boolean.TRUE);

            exporter.setParameter(JRExporterParameter.JASPER_PRINT, jasperPrint);
            // exporter.setParameter(JRXlsExporterParameter.OUTPUT_STREAM, outputByteArray);
            exporter.setParameter(JRXlsExporterParameter.IS_ONE_PAGE_PER_SHEET, Boolean.FALSE);
            exporter.setParameter(JRXlsExporterParameter.IGNORE_PAGE_MARGINS, Boolean.TRUE);
            exporter.setParameter(JRXlsExporterParameter.IS_DETECT_CELL_TYPE, Boolean.TRUE);
            exporter.setParameter(JRXlsExporterParameter.IS_WHITE_PAGE_BACKGROUND, Boolean.FALSE);
            exporter.setParameter(JRXlsExporterParameter.IS_REMOVE_EMPTY_SPACE_BETWEEN_ROWS, Boolean.TRUE);

            exporter.exportReport();

        } catch (Exception er) {
            new logger().OCategory.fatal(er.getMessage());
        }
        getOjconnexion().CloseConnexion();
    }

    public void BuildReportXLS(Map parameters, jconnexion Ojconnexion) {
        try {

            File reportFile = new File(this.getPath_report_src());
            String path = reportFile.getAbsolutePath();

            JasperPrint jasperPrint = JasperFillManager.fillReport(path, parameters, Ojconnexion.get_StringConnexion());
            String result = JasperRunManager.runReportToHtmlFile(this.getPath_report_src(), parameters,
                    Ojconnexion.get_StringConnexion());
            File destFile = new File(this.getPath_report_XLS());
            JRXlsExporter exporter = new JRXlsExporter();
            exporter.setParameter(JRExporterParameter.JASPER_PRINT, jasperPrint);
            exporter.setParameter(JRExporterParameter.OUTPUT_FILE_NAME, destFile.toString());
            exporter.setParameter(JRXlsExporterParameter.IS_ONE_PAGE_PER_SHEET, Boolean.TRUE);
            exporter.setParameter(JRXlsExporterParameter.IS_DETECT_CELL_TYPE, Boolean.TRUE);
            exporter.setParameter(JRExporterParameter.JASPER_PRINT, jasperPrint);
            // exporter.setParameter(JRXlsExporterParameter.OUTPUT_STREAM, outputByteArray);
            exporter.setParameter(JRXlsExporterParameter.IS_ONE_PAGE_PER_SHEET, Boolean.FALSE);
            exporter.setParameter(JRXlsExporterParameter.IGNORE_PAGE_MARGINS, Boolean.TRUE);
            exporter.setParameter(JRXlsExporterParameter.IS_DETECT_CELL_TYPE, Boolean.TRUE);
            exporter.setParameter(JRXlsExporterParameter.IS_WHITE_PAGE_BACKGROUND, Boolean.FALSE);
            exporter.setParameter(JRXlsExporterParameter.IS_REMOVE_EMPTY_SPACE_BETWEEN_ROWS, Boolean.TRUE);

            exporter.exportReport();

        } catch (Exception er) {
            new logger().OCategory.fatal(er.getMessage());
        }
        Ojconnexion.CloseConnexion();
    }

    /**
     * @return the ojconnexion
     */
    public jconnexion getOjconnexion() {
        return ojconnexion;
    }

    /**
     * @param ojconnexion
     *            the ojconnexion to set
     */
    public void setOjconnexion(jconnexion ojconnexion) {
        this.ojconnexion = ojconnexion;
    }

    /**
     * @return the Path_report_src
     */
    public String getPath_report_src() {
        return Path_report_src;
    }

    /**
     * @param Path_report_src
     *            the Path_report_src to set
     */
    public void setPath_report_src(String Path_report_src) {
        this.Path_report_src = Path_report_src;
    }

    /**
     * @return the Path_report_pdf
     */
    public String getPath_report_pdf() {
        return Path_report_pdf;
    }

    /**
     * @param Path_report_pdf
     *            the Path_report_pdf to set
     */
    public void setPath_report_pdf(String Path_report_pdf) {
        this.Path_report_pdf = Path_report_pdf;
    }

    /**
     * @return the Path_report_XLS
     */
    public String getPath_report_XLS() {
        return Path_report_XLS;
    }

    /**
     * @param Path_report_XLS
     *            the Path_report_XLS to set
     */
    public void setPath_report_XLS(String Path_report_XLS) {
        this.Path_report_XLS = Path_report_XLS;
    }

    public void BuildReportEmptyDs(Map parameters) {
        try {
            File sourceFile = new File(this.getPath_report_src());
            // JasperDesign jasperDesign = JRXmlLoader.load(this.getPath_report_src());
            // JasperReport jasperDesign = (JasperReport) JRLoader.loadObject(sourceFile);
            JasperReport jasperReport = JasperCompileManager.compileReport(this.getPath_report_src());
            // - Paramètres à envoyer au rapport
            // JasperReport jasperReport = (JasperReport) JRLoader.loadObject(sourceFile);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());
            // - Execution du rapport
            // JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new
            // JREmptyDataSource());
            // - Création du rapport au format PDF
            JasperExportManager.exportReportToPdfFile(jasperPrint, this.getPath_report_pdf());

        } catch (JRException e) {
            e.printStackTrace();

        }

    }

}
