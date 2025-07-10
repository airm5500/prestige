/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import dal.TOfficine;
import dal.TUser;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.print.PrintService;
import javax.print.attribute.HashPrintRequestAttributeSet;
import javax.print.attribute.PrintRequestAttributeSet;
import javax.print.attribute.standard.MediaSizeName;
import javax.servlet.http.HttpServletResponse;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPrintServiceExporter;
import net.sf.jasperreports.engine.export.ooxml.JRDocxExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.engine.util.JRLoader;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimplePrintServiceExporterConfiguration;
import net.sf.jasperreports.export.SimpleXlsxReportConfiguration;
import org.apache.commons.lang3.StringUtils;
import toolkits.utils.jdom;
import util.DateConverter;

/**
 *
 * @author DICI
 */
@Stateless
public class ReportUtil {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    private static final Logger LOG = Logger.getLogger(ReportUtil.class.getName());

    private static final String FILE_PATERN = "yyyy_MM_dd_HH_mm_ss";

    public TOfficine findOfficine() {
        return em.find(TOfficine.class, "1");
    }

    public JasperReport getReport(String reportName, String reportPath) throws JRException, Exception {

        try (InputStream resource = new FileInputStream(reportPath + reportName + ".jasper")) {
            return (JasperReport) JRLoader.loadObject(resource);
        } catch (FileNotFoundException e) {
            LOG.log(Level.SEVERE, "Le fichier n'est pas accessible {0}", reportName);
            return compileReport(reportName, reportPath);
        }

    }

    public JasperReport compileReport(String reportName, String reportPath) throws Exception {
        InputStream in = null;
        InputStream in2 = null;
        FileOutputStream out = null;
        File jasperFile = null;

        try {

            File jrxmlFile = new File(reportPath + reportName + ".jrxml");
            File dir = jrxmlFile.getParentFile();
            jasperFile = new File(dir, reportName + ".jasper");
            in = new FileInputStream(jrxmlFile);

            out = new FileOutputStream(jasperFile);
            JasperCompileManager.compileReportToStream(in, out);
            in2 = new FileInputStream(jasperFile);
            return (JasperReport) JRLoader.loadObject(in2);

        } catch (FileNotFoundException | JRException e) {

            if (jasperFile != null) {
                jasperFile.delete();
            }

            throw e;
        } finally {
            if (in != null) {
                in.close();
            }
            if (in2 != null) {
                in2.close();
            }
            if (out != null) {
                out.close();
            }

        }
    }

    public JasperReport getDefaultReport(String reportName, String reportPath) {
        InputStream resource = null;
        try {
            resource = ReportUtil.class.getResourceAsStream(reportPath + reportName + ".jasper");
            return (JasperReport) JRLoader.loadObject(resource);

        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);
            return null;

        } finally {
            try {
                if (resource != null) {
                    resource.close();
                }
            } catch (IOException e) {

                LOG.log(Level.SEVERE, null, e);
            }
        }
    }

    public void buildReportEmptyDs(Map<String, Object> parameters, String reportName, String path, String pdfPath) {
        try {
            JasperReport jasperReport = getReport(reportName, path);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());
            JasperExportManager.exportReportToPdfFile(jasperPrint, pdfPath);

        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
    }

    public void buildReportEmptyDs(Map<String, Object> parameters, String path, String pdfPath) {
        try {
            JasperReport jasperReport = JasperCompileManager.compileReport(path);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());
            JasperExportManager.exportReportToPdfFile(jasperPrint, pdfPath);

        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        }
    }

    public Map<String, Object> officineData(TUser op) {
        TOfficine oTOfficine = findOfficine();
        Map<String, Object> parameters = new HashMap<>();
        try {
            String logo = jdom.scr_report_file_logo;
            String institution = oTOfficine.getStrNOMABREGE();
            String adresseInstition = oTOfficine.getStrADRESSSEPOSTALE();
            String footer = "";
            parameters.put("P_H_LOGO", logo);
            parameters.put("P_H_INSTITUTION", institution);
            parameters.put("P_PRINTED_BY", " " + op.getStrFIRSTNAME() + "  " + op.getStrLASTNAME());
            parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
            if (StringUtils.isNotEmpty(oTOfficine.getStrREGISTRECOMMERCE())) {
                footer += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
            }
            if (StringUtils.isNotEmpty(oTOfficine.getStrCOMPTECONTRIBUABLE())) {
                footer += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
            }
            if (StringUtils.isNotEmpty(oTOfficine.getStrREGISTREIMPOSITION())) {
                footer += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
            }
            if (StringUtils.isNotEmpty(oTOfficine.getStrCENTREIMPOSITION())) {
                footer += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
            }

            if (StringUtils.isNotEmpty(oTOfficine.getStrPHONE())) {
                String finalphonestring = oTOfficine.getStrPHONE() != null
                        ? "- Tel: " + DateConverter.phoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
                if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                    String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                    for (String va : phone) {
                        finalphonestring += " / " + DateConverter.phoneNumberFormat(va);
                    }
                }
                adresseInstition += " -  " + finalphonestring;
            }
            if (StringUtils.isNotEmpty(oTOfficine.getStrCOMPTEBANCAIRE())) {
                adresseInstition += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
            }
            if (StringUtils.isNotEmpty(oTOfficine.getStrNUMCOMPTABLE())) {
                adresseInstition += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
            }
            parameters.put("P_INSTITUTION_ADRESSE", adresseInstition);
            parameters.put("P_FOOTER_RC", footer);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return parameters;
    }

    public void buildReport(Map<String, Object> parameters, String reportName, String path, String pdfPath,
            List<?> datas) {
        try {
            JasperReport jasperReport = getReport(reportName, path);
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(datas);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            JasperExportManager.exportReportToPdfFile(jasperPrint, pdfPath);
        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
    }

    public Map<String, Object> ticketParamsCommons(TOfficine oTOfficine) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("raisonsocial", oTOfficine.getStrNOMCOMPLET());
        parameters.put("sectionInfos", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
        parameters.put("firstComment", oTOfficine.getStrENTETE());
        parameters.put("thanksMsg", oTOfficine.getStrCOMMENTAIRE1());
        parameters.put("adressPhone", oTOfficine.getStrPHONE() + "   |    " + oTOfficine.getStrADRESSSEPOSTALE());
        return parameters;

    }

    public Map<String, Object> ticketParams(Map<String, Object> parameters, String modeReglement, int net) {
        parameters.put("totalvente", net);
        parameters.put("modeReglement", modeReglement);
        return parameters;

    }

    public Map<String, Object> numTicketParams(Map<String, Object> parameters, String ticketNum) {
        parameters.put("ticketNum", "Ticket # " + ticketNum);
        return parameters;

    }

    public Map<String, Object> operateurParams(Map<String, Object> parameters, String fullName) {
        parameters.put("operateur", fullName);
        return parameters;

    }

    public Map<String, Object> setSignature(Map<String, Object> parameters, String signature) {
        parameters.put("signature", signature);
        return parameters;

    }

    public Map<String, Object> barecodeDataParams(Map<String, Object> parameters, String barcodeData) {
        parameters.put("barcodeData", barcodeData);
        return parameters;

    }

    public Map<String, Object> ticketParamsMontantVerse(Map<String, Object> parameters, int montantVerse,
            int montantRendu) {
        parameters.put("montantVerse", montantVerse);
        parameters.put("montantRendu", montantRendu);
        return parameters;

    }

    public Map<String, Object> ticketParams(Map<String, Object> parameters, String ticketNum, Date dateOperation,
            String infosCaisse) {
        parameters.put("dateoperation", dateOperation);
        parameters.put("infosCaisse", infosCaisse);
        return parameters;

    }

    public Map<String, Object> carnetTpParams(Map<String, Object> parameters, String clientFullName, String matricule,
            int montantClient, String tierpayantName, int tauxtp, int partTp) {
        parameters.put("matricule ", matricule);
        parameters.put("clientFullName", clientFullName);
        parameters.put("montantClient", montantClient);
        parameters.put("tierpayantName", tierpayantName);
        parameters.put("tauxtp", tauxtp);
        parameters.put("partTp", partTp);
        return parameters;

    }

    public void printTicket(Map<String, Object> parameters, String reportName, String path, PrintService printService,
            List<?> datas) {
        try {

            PrintRequestAttributeSet printRequestAttributeSet = new HashPrintRequestAttributeSet();
            printRequestAttributeSet.add(MediaSizeName.ISO_A4);
            JasperReport jasperReport = getReport(reportName, path);
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(datas);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            JRPrintServiceExporter exporter = new JRPrintServiceExporter();

            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            SimplePrintServiceExporterConfiguration configuration = new SimplePrintServiceExporterConfiguration();
            configuration.setPrintRequestAttributeSet(printRequestAttributeSet);
            configuration.setPrintService(printService);
            configuration.setDisplayPageDialog(false);
            configuration.setDisplayPrintDialog(false);
            exporter.setConfiguration(configuration);
            exporter.exportReport();

        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
    }

    public void buildReportDocx(Map<String, Object> parameters, String reportName, String path, String pdfPath,
            List<?> datas) {
        try {
            JasperReport jasperReport = getReport(reportName, path);
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(datas);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            JRDocxExporter exporter = new JRDocxExporter();
            exporter.setExporterInput(SimpleExporterInput.getInstance(List.of(jasperPrint)));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(pdfPath));
            exporter.exportReport();
        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
    }

    public void buildReportExcel(Map<String, Object> parameters, String reportName, String path, String pdfPath,
            List<?> datas) {
        try {
            JasperReport jasperReport = getReport(reportName, path);
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(datas);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

            JRXlsxExporter exporter = new JRXlsxExporter();
            exporter.setExporterInput(SimpleExporterInput.getInstance(List.of(jasperPrint)));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(pdfPath));
            SimpleXlsxReportConfiguration configuration = new SimpleXlsxReportConfiguration();
            configuration.setOnePagePerSheet(true);
            exporter.setConfiguration(configuration);
            exporter.exportReport();
        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
    }

    public void buildReportExcelSinglePage(Map<String, Object> parameters, String reportName, String path,
            String pdfPath, List<?> datas) {
        try {
            JasperReport jasperReport = getReport(reportName, path);
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(datas);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

            JRXlsxExporter exporter = new JRXlsxExporter();
            exporter.setExporterInput(SimpleExporterInput.getInstance(List.of(jasperPrint)));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(pdfPath));
            SimpleXlsxReportConfiguration configuration = new SimpleXlsxReportConfiguration();
            configuration.setRemoveEmptySpaceBetweenRows(true);
            configuration.setOnePagePerSheet(false);
            exporter.setConfiguration(configuration);
            exporter.exportReport();
        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
    }

    public String getReportDirectory(String fileName) {
        return jdom.scr_report_pdf + fileName;
    }

    public String getFileNames(String reportName) {
        return reportName + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern(FILE_PATERN)) + ".pdf";
    }

    public String buildReport(Map<String, Object> parameters, String reportName, List<?> datas) {
        String fileName = getFileNames(reportName);
        try {
            JasperReport jasperReport = getReport(reportName, jdom.scr_report_file);
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(datas);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            JasperExportManager.exportReportToPdfFile(jasperPrint, this.getReportDirectory(fileName));
        } catch (JRException e) {
            LOG.log(Level.SEVERE, null, e);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
        return "/data/reports/pdf/" + fileName;
    }

    public void exportToxlsx(HttpServletResponse response, File filetoExport) {
        OutputStream out = null;
        FileInputStream inStream = null;
        try {
            out = response.getOutputStream();
            inStream = new FileInputStream(filetoExport);
            String filename = filetoExport.getName() + ".xlsx";
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setContentLengthLong(filetoExport.length());
            response.setHeader("Content-disposition", "inline; filename=" + filename);
            OutputStream outStream = response.getOutputStream();

            byte[] buffer = new byte[4096];
            int bytesRead;

            while ((bytesRead = inStream.read(buffer)) != -1) {
                outStream.write(buffer, 0, bytesRead);
            }

        } catch (IOException ex) {
            LOG.log(Level.SEVERE, null, ex);
        } finally {
            if (inStream != null) {
                try {
                    if (out != null) {
                        out.flush();
                    }
                    inStream.close();
                } catch (IOException ex) {
                    LOG.log(Level.SEVERE, null, ex);
                }
            }
        }
    }
}
