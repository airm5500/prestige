/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package fileupload;

import bll.commandeManagement.orderManagement;
//import bll.stockManagement.InventaireManager;
import dal.dataManager;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class DownloadFileServlet extends HttpServlet {

    String filePath = "", lg_INVENTAIRE_ID = "", str_TYPEREPORT = "", search_value = "", str_TYPE_ACTION = "";
    String lg_GROSSISTE_ID = "%%", lg_FAMILLEARTICLE_ID = "%%", lg_ZONE_GEO_ID = "%%", lg_ORDER_ID = "%%";

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        dataManager ODataManager = new dataManager();
        ODataManager.initEntityManager();
        // InventaireManager OInventaireManager = null;
        orderManagement OorderManagement = null;

        if (request.getParameter("lg_GROSSISTE_ID") != null && request.getParameter("lg_GROSSISTE_ID") != "") {
            lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
            new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
        }

        if (request.getParameter("str_TYPEREPORT") != null) {
            str_TYPEREPORT = request.getParameter("str_TYPEREPORT");
            new logger().OCategory.info("str_TYPEREPORT->" + request.getParameter("str_TYPEREPORT"));

        }
        if (request.getParameter("search_value") != null) {
            search_value = request.getParameter("search_value");
            new logger().OCategory.info("search_value->" + request.getParameter("search_value"));

        }

        if (request.getParameter("str_TYPE_ACTION") != null && request.getParameter("str_TYPE_ACTION") != "") {
            str_TYPE_ACTION = request.getParameter("str_TYPE_ACTION");
            new logger().OCategory.info("str_TYPE_ACTION " + str_TYPE_ACTION);
        }

        if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.code_action_inventaire)) {
            if (request.getParameter("lg_INVENTAIRE_ID") != null && request.getParameter("lg_INVENTAIRE_ID") != "") {
                lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
                new logger().OCategory.info("lg_INVENTAIRE_ID " + lg_INVENTAIRE_ID);
            }

            if (request.getParameter("lg_FAMILLEARTICLE_ID") != null
                    && request.getParameter("lg_FAMILLEARTICLE_ID") != "") {
                lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
                new logger().OCategory.info("lg_FAMILLEARTICLE_ID " + lg_FAMILLEARTICLE_ID);
            }

            if (request.getParameter("lg_ZONE_GEO_ID") != null && request.getParameter("lg_ZONE_GEO_ID") != "") {
                lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
                new logger().OCategory.info("lg_ZONE_GEO_ID " + lg_ZONE_GEO_ID);
            }

            // OInventaireManager = new InventaireManager(ODataManager);
            // filePath = OInventaireManager.getFilePathToExportTxtOrCsv(str_TYPEREPORT, lg_INVENTAIRE_ID,
            // lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID);

        } else if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.code_action_commande)) {
            if (request.getParameter("lg_ORDER_ID") != null) {
                lg_ORDER_ID = request.getParameter("lg_ORDER_ID");
                new logger().OCategory.info("lg_ORDER_ID->" + request.getParameter("lg_ORDER_ID"));
            }

            OorderManagement = new orderManagement(ODataManager);
            filePath = OorderManagement.ExportOrderCSV(lg_ORDER_ID);
        } else if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.code_action_etatcontrole)) {
            if (request.getParameter("lg_ORDER_ID") != null) {
                lg_ORDER_ID = request.getParameter("lg_ORDER_ID");
                new logger().OCategory.info("lg_ORDER_ID->" + request.getParameter("lg_ORDER_ID"));
            }

            OorderManagement = new orderManagement(ODataManager);
            filePath = OorderManagement.ExportEtatCommandeByOrderCSV(lg_ORDER_ID);
        }
        new logger().OCategory.info("filePath->" + filePath);
        File downloadFile = new File(filePath);
        FileInputStream inStream = new FileInputStream(downloadFile);

        // if you want to use a relative path to context root:
        String relativePath = getServletContext().getRealPath("");
        System.out.println("relativePath = " + relativePath);

        // obtains ServletContext
        ServletContext context = getServletContext();

        // gets MIME type of the file
        String mimeType = context.getMimeType(filePath);
        if (mimeType == null) {
            // set to binary type if MIME mapping not found
            mimeType = "application/octet-stream";
        }
        System.out.println("MIME type: " + mimeType);

        // modifies response
        response.setContentType(mimeType);
        response.setContentLength((int) downloadFile.length());

        // forces download
        String headerKey = "Content-Disposition";
        String headerValue = String.format("attachment; filename=\"%s\"", downloadFile.getName());
        response.setHeader(headerKey, headerValue);

        // obtains response's output stream
        OutputStream outStream = response.getOutputStream();

        byte[] buffer = new byte[4096];
        int bytesRead = -1;

        while ((bytesRead = inStream.read(buffer)) != -1) {
            outStream.write(buffer, 0, bytesRead);
        }

        inStream.close();
        outStream.close();
    }

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
}
