/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import dal.TFamille;
import dal.TInventaireFamille;
import dal.dataManager;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;

@WebServlet(name = "ExportInventaire", urlPatterns = { "/ExportInventaire" })
public class ExportInventaire extends HttpServlet {

    DateFormat df = new SimpleDateFormat("dd_MM_YYYY_HH_mm_ss");
    private final static Logger LOGGER = Logger.getLogger(ExportInventaire.class.getName());

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // TUser OTUser = null;
        dataManager OdataManager = new dataManager();
        OdataManager.initEntityManager();
        String format = request.getParameter("format");
        String lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
        // String statut ="is_Closed";// "enable";
        try {
            List<TInventaireFamille> list = getInventaireFamilles(lg_INVENTAIRE_ID, OdataManager.getEm());
            if (format.equals("csv")) {
                articleCSV(list, response);

            } else {
                extportToExcel(list, response);
            }

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }

    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }

    private void articleCSV(List<TInventaireFamille> list, HttpServletResponse response) throws Exception {
        OutputStream out = null;
        try {

            String filename = "inventaire_" + df.format(new Date()) + ".csv";
            out = response.getOutputStream();
            response.setContentType("text/csv");

            response.setHeader("Content-disposition", "inline; filename=" + filename);

            Writer writer = new OutputStreamWriter(out, "UTF-8");
            try (CSVPrinter printer = CSVFormat.DEFAULT.withHeader(ArticleHeader.class).print(writer)) {

                for (TInventaireFamille famille : list) {
                    TFamille OFamille = famille.getLgFAMILLEID();
                    printer.printRecord(OFamille.getLgFAMILLEID(), OFamille.getIntCIP(),
                            OFamille.getLgZONEGEOID().getStrLIBELLEE(), famille.getIntNUMBERINIT(),
                            OFamille.getIntPAF(), OFamille.getIntPRICE());

                }
                printer.flush();
            }
            out.flush();
        } catch (IOException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
            } catch (IOException ex) {
                LOGGER.log(Level.SEVERE, null, ex);
            }
        }

    }

    enum ArticleHeader {
        IDARTICLE, CIP, EMPLACEMENT, QTEINITIAL, PRIXACHAT, PRIXVENTE
    }

    public List<TInventaireFamille> getInventaireFamilles(String lg_INVENTAIRE_ID, EntityManager em) throws Exception {
        TypedQuery<TInventaireFamille> query = em.createQuery(
                "SELECT o FROM TInventaireFamille o WHERE o.lgINVENTAIREID.lgINVENTAIREID =?1",
                TInventaireFamille.class);
        query.setParameter(1, lg_INVENTAIRE_ID);
        return query.getResultList();
    }

    private void extportToExcel(List<TInventaireFamille> list, HttpServletResponse response) throws Exception {
        OutputStream out = null;

        String filename = "inventaire_" + df.format(new Date()) + ".xls";
        try {
            out = response.getOutputStream();
            response.setContentType("application/vnd.ms-excel");
            // response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            response.setHeader("Content-disposition", "inline; filename=" + filename);
            // XSSFWorkbook wb = new XSSFWorkbook();
            Workbook wb = new HSSFWorkbook();

            Sheet sheet = wb.createSheet("INVENTAIRE");

            sheet.setColumnWidth(0, 7000);
            sheet.setColumnWidth(1, 6000);
            sheet.setColumnWidth(2, 12000);
            sheet.setColumnWidth(3, 4000);
            sheet.setColumnWidth(4, 4000);
            sheet.setColumnWidth(5, 4000);

            Row titleheaderrow = sheet.createRow((short) 0);

            titleheaderrow.setHeightInPoints(20);
            // titleheaderrow.createCell((short) 0).setCellValue(ArticleHeader.ID.name());
            titleheaderrow.createCell((short) 0).setCellValue(ArticleHeader.IDARTICLE.name());
            titleheaderrow.createCell((short) 1).setCellValue(ArticleHeader.CIP.name());
            titleheaderrow.createCell((short) 2).setCellValue(ArticleHeader.EMPLACEMENT.name());
            titleheaderrow.createCell((short) 3).setCellValue(ArticleHeader.QTEINITIAL.name());

            titleheaderrow.createCell((short) 4).setCellValue(ArticleHeader.PRIXACHAT.name());
            titleheaderrow.createCell((short) 5).setCellValue(ArticleHeader.PRIXVENTE.name());

            int count = 1;
            for (int i = 0; i < list.size(); i++) {
                Row row = sheet.createRow((short) count + i);
                // ID,IDARTICLE, CIP, EMPLACEMENT, QTEINITIAL, PRIXACHAT, PRIXVENTE
                TInventaireFamille famille = list.get(i);
                TFamille tf = famille.getLgFAMILLEID();

                Cell IDARTICLE = row.createCell((short) 0);
                IDARTICLE.setCellValue(tf.getLgFAMILLEID());

                Cell CIP = row.createCell((short) 1);
                CIP.setCellValue(tf.getIntCIP());

                Cell EMPLACEMENT = row.createCell((short) 2);
                EMPLACEMENT.setCellValue(tf.getLgZONEGEOID().getStrLIBELLEE());
                Cell QTEINITIAL = row.createCell((short) 3);
                QTEINITIAL.setCellValue(famille.getIntNUMBERINIT());
                Cell PRIXACHAT = row.createCell((short) 4);
                PRIXACHAT.setCellValue(tf.getIntPAF());
                Cell PRIXVENTE = row.createCell((short) 5);
                PRIXVENTE.setCellValue(tf.getIntPRICE());

            }
            wb.write(out);
            out.flush();

        } catch (IOException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
            } catch (IOException ex) {
                LOGGER.log(Level.SEVERE, null, ex);
            }
        }

    }

}
