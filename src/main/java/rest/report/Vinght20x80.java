
package rest.report;

import commonTasks.dto.VenteDetailsDTO;
import dal.TOfficine;
import dal.TUser;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import rest.report.pdf.excel.ExcelExporter;
import rest.service.CaisseService;
import rest.service.FamilleArticleService;
import toolkits.utils.jdom;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "Vinght20x80", urlPatterns = { "/Vinght20x80" })
public class Vinght20x80 extends HttpServlet {

    @EJB
    CaisseService caisseService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private FamilleArticleService familleArticleService;
    private final Comparator<VenteDetailsDTO> comparatorQty = Comparator.comparingInt(VenteDetailsDTO::getIntQUANTITY);
    private final Comparator<VenteDetailsDTO> comparatorPrice = Comparator.comparingInt(VenteDetailsDTO::getIntPRICE);

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser oUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String codeFamile = request.getParameter("codeFamile");
        String codeRayon = request.getParameter("codeRayon");
        String codeGrossiste = request.getParameter("codeGrossiste");
        boolean qtyOrCa = Boolean.parseBoolean(request.getParameter("qtyOrCa"));
        // String mode = "pdf";
        geVingtQuatreVingt(request, response, dtStart, dtEnd, oUser, codeFamile, codeRayon, codeGrossiste, qtyOrCa,
                action);

    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the
    // code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request
     *            servlet request
     * @param response
     *            servlet response
     *
     * @throws ServletException
     *             if a servlet-specific error occurs
     * @throws IOException
     *             if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request
     *            servlet request
     * @param response
     *            servlet response
     *
     * @throws ServletException
     *             if a servlet-specific error occurs
     * @throws IOException
     *             if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    public void geVingtQuatreVingt(HttpServletRequest request, HttpServletResponse response, String dtStart,
            String dtEnd, TUser tu, String codeFamile, String codeRayon, String codeGrossiste, boolean qtyOrCa,
            String mode) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scrReportFile = "rp_vingtquatre";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String periode = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            periode += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        String tile = qtyOrCa ? " PAR QUANTITE VENDUE " : "PAR CHIFFRE D'AFFAIRE ";
        parameters.put("P_H_CLT_INFOS", "EDITION DES 20/80" + tile + periode);
        String reportGenerateFile = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        if ("pdf".equals(mode)) {
            reportGenerateFile = reportGenerateFile + ".pdf";
            response.setContentType("application/pdf");
        } else {
            reportGenerateFile = reportGenerateFile + ".xlsx";
        }
        List<VenteDetailsDTO> datas = familleArticleService.geVingtQuatreVingt(dtStart, dtEnd, tu, codeFamile,
                codeRayon, codeGrossiste, 0, 0, true, qtyOrCa);
        if (qtyOrCa) {
            datas.sort(comparatorQty.reversed());
        } else {
            datas.sort(comparatorPrice.reversed());
        }
        if ("pdf".equals(mode)) {
            reportUtil.buildReport(parameters, scrReportFile, jdom.scr_report_file,
                    jdom.scr_report_pdf + "rp_vingtquatre" + reportGenerateFile, datas);
            response.sendRedirect(request.getContextPath() + "/data/reports/pdf/rp_vingtquatre" + reportGenerateFile);
        } else {
            String finalFilePath = jdom.scr_report_pdf + "rp_vingtquatre" + reportGenerateFile;

            reportUtil.buildReportExcelSinglePage(parameters, scrReportFile, jdom.scr_report_file, finalFilePath,
                    datas);
            exportToxlsx(response, new File(finalFilePath));
        }

    }

    private void exportToxlsx(HttpServletResponse response, File filetoExport) {
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
            Logger.getLogger(ExcelExporter.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            if (inStream != null) {
                try {
                    if (out != null) {
                        out.flush();
                    }
                    inStream.close();
                } catch (IOException ex) {
                    Logger.getLogger(ExcelExporter.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        }
    }

}
