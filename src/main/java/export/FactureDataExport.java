/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package export;

import bll.facture.factureManagement;
import bll.report.StatisticSales;
import bll.report.StatisticsFamilleArticle;
import dal.dataManager;
import java.io.IOException;
import java.io.OutputStream;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;

import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.hssf.util.HSSFColor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONArray;
import org.json.JSONException;

import org.json.JSONObject;
import toolkits.utils.date;

/**
 *
 * @author KKOFFI
 */
@WebServlet(name = "FactureDataExport", urlPatterns = { "/FactureDataExport" })
public class FactureDataExport extends HttpServlet {

    private static final long serialVersionUID = 1L;

    final SimpleDateFormat formatter = new SimpleDateFormat("dd-MM-yyyy");
    private final dataManager OdataManager = new dataManager();
    private factureManagement management = null;
    private StatisticSales statisticSales = null;
    private StatisticsFamilleArticle statisticsFamilleArticle = null;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, ParseException, JSONException {

        OdataManager.initEntityManager();
        String search_value = "", action = request.getParameter("action"),
                dt_debut = date.formatterMysqlShort.format(new Date()), dt_fin = date.formatterMysql.format(new Date()),
                lg_FACTURE_ID = "%%", lg_TYPE_FACTURE_ID = "%%", lg_customer_id = "%%";
        String impayes = "";
        JSONObject dataToExport;
        management = new factureManagement(OdataManager, null);// 30032016
        statisticSales = new StatisticSales(OdataManager);
        statisticsFamilleArticle = new StatisticsFamilleArticle(OdataManager);
        if (StringUtils.isNotEmpty(request.getParameter("impayes"))) {
            impayes = request.getParameter("impayes");

        }
        String code = null;
        if (request.getParameter("CODEGROUPE") != null && !"".equals(request.getParameter("CODEGROUPE"))) {
            code = request.getParameter("CODEGROUPE");
        }
        if (request.getParameter("dt_fin") != null && !"".equals(request.getParameter("dt_fin"))) {
            dt_fin = request.getParameter("dt_fin") + " 23:59:59";
        }
        if (request.getParameter("dt_debut") != null && !"".equals(request.getParameter("dt_debut"))) {
            dt_debut = request.getParameter("dt_debut");
        }
        if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
            search_value = request.getParameter("search_value");
        }

        if (request.getParameter("lg_FACTURE_ID") != null && !"".equals(request.getParameter("lg_FACTURE_ID"))) {
            lg_FACTURE_ID = request.getParameter("lg_FACTURE_ID");
        }
        if (request.getParameter("lg_TYPE_FACTURE_ID") != null
                && !"".equals(request.getParameter("lg_TYPE_FACTURE_ID"))) {
            lg_TYPE_FACTURE_ID = request.getParameter("lg_TYPE_FACTURE_ID");
        }
        if (request.getParameter("lg_customer_id") != null && !"".equals(request.getParameter("lg_customer_id"))) {
            lg_customer_id = request.getParameter("lg_customer_id");
        }
        if ("facture".equals(action)) {
            Date end = new Date();
            if (!"".equals(dt_fin)) {
                end = date.formatterMysql.parse(dt_fin);
            }
            dt_debut = date.formatterMysqlShort.format(date.getPreviousMonth(new Date()));

            if (request.getParameter("dt_debut") != null && !"".equals(request.getParameter("dt_debut"))) {
                dt_debut = request.getParameter("dt_debut");
            }

            dataToExport = management.getInvoiceExportToExcelData(search_value, lg_FACTURE_ID, lg_TYPE_FACTURE_ID,
                    java.sql.Date.valueOf(dt_debut), end, lg_customer_id, code, impayes);

            extportFactureData2(dataToExport, response, "Facture releve client");
        }
        if ("ArticleVendu".equals(action)) {
            try {
                if ("".equals(search_value)) {
                    search_value = "%%";
                }
                dataToExport = statisticSales.dataJsonArticleVenduACredi(search_value, dt_debut, dt_fin);
                extportSimpleData(dataToExport, response, "Liste des articles vendus à crédit");
            } catch (JSONException ex) {
                Logger.getLogger(FactureDataExport.class.getName()).log(Level.SEVERE, null, ex);
            }
        }
        if ("Achatfournisseur".equals(action)) {
            try {
                if ("".equals(search_value)) {
                    search_value = "%%";
                }
                Date end = new Date();
                if (!"".equals(dt_fin)) {
                    end = date.formatterMysql.parse(dt_fin);
                }
                dataToExport = statisticsFamilleArticle.achatFournisseur(search_value, java.sql.Date.valueOf(dt_debut),
                        end);
                extportSimpleData(dataToExport, response, "La liste des fournisseurs avec les produits achetés");
            } catch (JSONException ex) {
                Logger.getLogger(FactureDataExport.class.getName()).log(Level.SEVERE, null, ex);
            }
        }

    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (ParseException ex) {
            Logger.getLogger(FactureDataExport.class.getName()).log(Level.SEVERE, null, ex);
        } catch (JSONException ex) {
            Logger.getLogger(FactureDataExport.class.getName()).log(Level.SEVERE, null, ex);
        }

    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (ParseException ex) {
            Logger.getLogger(FactureDataExport.class.getName()).log(Level.SEVERE, null, ex);
        } catch (JSONException ex) {
            Logger.getLogger(FactureDataExport.class.getName()).log(Level.SEVERE, null, ex);
        }

    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private void extportSimpleData(JSONObject data, HttpServletResponse response, String title) throws JSONException {
        OutputStream out = null;
        String filename = title + formatter.format(new Date()) + ".xls";

        try {
            out = response.getOutputStream();
            response.setContentType("application/vnd.ms-excel");
            // response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            response.setHeader("Content-disposition", "inline; filename=" + filename);
            // XSSFWorkbook wb = new XSSFWorkbook();
            Workbook wb = new HSSFWorkbook();
            // XSSFSheet sheet = wb.createSheet(title);
            Sheet sheet = wb.createSheet(title);
            sheet.setColumnWidth(0, 7000);
            sheet.setColumnWidth(1, 7000);
            sheet.setColumnWidth(2, 7000);
            sheet.setColumnWidth(3, 7000);
            sheet.setColumnWidth(4, 7000);
            sheet.setColumnWidth(5, 7000);
            sheet.setColumnWidth(6, 7000);
            sheet.setColumnWidth(7, 7000);
            sheet.setColumnWidth(8, 7000);
            sheet.setColumnWidth(9, 7000);
            sheet.setColumnWidth(10, 7000);
            sheet.setColumnWidth(11, 7000);
            sheet.setColumnWidth(12, 7000);
            sheet.setColumnWidth(13, 7000);
            sheet.setColumnWidth(14, 7000);
            // sheet.setDefaultRowHeight((short) 1000);
            Font parentHeaderfont = wb.createFont();
            parentHeaderfont.setBoldweight((short) 700);
            parentHeaderfont.setFontHeightInPoints((short) 16);
            Font subtitlefont = wb.createFont();
            CellStyle cellStyle = wb.createCellStyle();
            cellStyle.setFillBackgroundColor(HSSFColor.GREY_25_PERCENT.index);
            cellStyle.setFillPattern(CellStyle.SOLID_FOREGROUND);
            cellStyle.setFillForegroundColor(HSSFColor.GREY_25_PERCENT.index);
            subtitlefont.setBoldweight((short) 700);
            subtitlefont.setFontHeightInPoints((short) 14);

            JSONArray parentheader = data.getJSONArray("dataheader");
            Row titleheaderrow = sheet.createRow((short) 0);
            titleheaderrow.setHeightInPoints(20);

            for (int i = 0; i < parentheader.length(); i++) {

                titleheaderrow.createCell((short) i).setCellValue(parentheader.getString(i));
            }
            JSONArray dataValue = data.getJSONArray("datavalue");

            int count = 1;
            for (int j = 0; j < dataValue.length(); j++) {
                Row facturedetailsrow = sheet.createRow((short) count);

                JSONArray datadetails = (JSONArray) dataValue.get(j);

                for (int q = 0; q < datadetails.length(); q++) {

                    facturedetailsrow.createCell(q).setCellValue(datadetails.get(q) + "");
                }
                count++;

            }

            wb.write(out);
            out.flush();

        } catch (IOException ex) {
            ex.printStackTrace();
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }

    }

    private void extportFactureData2(JSONObject data, HttpServletResponse response, String title) throws JSONException {
        OutputStream out = null;
        String filename = title + formatter.format(new Date()) + ".xls";

        try {
            out = response.getOutputStream();
            response.setContentType("application/vnd.ms-excel");

            response.setHeader("Content-disposition", "inline; filename=" + filename);

            Workbook wb = new HSSFWorkbook();

            Sheet sheet = wb.createSheet(title);
            sheet.setColumnWidth(0, 7000);
            sheet.setColumnWidth(1, 7000);
            sheet.setColumnWidth(2, 7000);
            sheet.setColumnWidth(3, 7000);
            sheet.setColumnWidth(4, 7000);
            sheet.setColumnWidth(5, 7000);
            sheet.setColumnWidth(6, 7000);
            sheet.setColumnWidth(7, 7000);
            sheet.setColumnWidth(8, 7000);
            sheet.setColumnWidth(9, 7000);
            sheet.setColumnWidth(10, 7000);

            Font parentHeaderfont = wb.createFont();
            parentHeaderfont.setBoldweight((short) 700);
            parentHeaderfont.setFontHeightInPoints((short) 16);
            Font subtitlefont = wb.createFont();
            CellStyle cellStyle = wb.createCellStyle();
            cellStyle.setFillBackgroundColor(HSSFColor.GREY_25_PERCENT.index);
            cellStyle.setFillPattern(CellStyle.SOLID_FOREGROUND);
            cellStyle.setFillForegroundColor(HSSFColor.GREY_25_PERCENT.index);
            subtitlefont.setBoldweight((short) 700);
            subtitlefont.setFontHeightInPoints((short) 14);

            JSONArray parentheader = data.getJSONArray("parentheader");
            Row titleheaderrow = sheet.createRow((short) 0);
            titleheaderrow.setHeightInPoints(20);

            for (int i = 0; i < parentheader.length(); i++) {

                titleheaderrow.createCell((short) i).setCellValue(parentheader.getString(i));
            }
            Row titlechildrow = sheet.createRow((short) 1);
            JSONArray childheader = data.getJSONArray("childheader");
            for (int i = 0; i < childheader.length(); i++) {
                Cell cell = titlechildrow.createCell((short) i);

                cell.setCellValue(childheader.getString(i));
            }

            JSONArray parentData = data.getJSONArray("parentData");

            int count = 2;

            for (int i = 0; i < parentData.length(); i++) {
                Row parentDataRow = sheet.createRow((short) count);

                JSONObject o = (JSONObject) parentData.getJSONObject(i);

                JSONArray headerdatavalue = o.getJSONArray("headerdatavalue");

                for (int q = 0; q < headerdatavalue.length(); q++) {
                    Cell cell = parentDataRow.createCell((short) q);
                    cell.setCellStyle(cellStyle);
                    cell.setCellValue(headerdatavalue.get(q) + "");

                }

                JSONArray facturedetails = o.getJSONArray("childdatavalues");

                int childcount = count + 1;
                count += facturedetails.length() + 1;

                for (int j = 0; j < facturedetails.length(); j++) {
                    Row facturedetailsrow = sheet.createRow((short) childcount);

                    JSONArray datadetails = (JSONArray) facturedetails.get(j);

                    for (int q = 0; q < datadetails.length(); q++) {
                        facturedetailsrow.createCell(q).setCellValue(datadetails.get(q) + "");
                    }
                    childcount++;
                }

            }

            wb.write(out);
            out.flush();

        } catch (IOException ex) {
            ex.printStackTrace();
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }

    }
}
