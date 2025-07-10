/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package fileupload;

import bll.migration.MigrationManager;
import dal.TUser;
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
import javax.servlet.http.HttpSession;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class MigrationServlet extends HttpServlet {

    String filePath = "", table_name = "", extension = "", liste_param = "";

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        dataManager ODataManager = new dataManager();
        ODataManager.initEntityManager();
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

        new logger().OCategory.info("Utilisateur connecté");
        MigrationManager OMigrationManager = new MigrationManager(ODataManager, OTUser);

        if (request.getParameter("extension") != null) {
            extension = request.getParameter("extension");
            new logger().OCategory.info("extension->" + request.getParameter("extension"));
        }

        if (request.getParameter("liste_param") != null && !request.getParameter("liste_param").equalsIgnoreCase("")) {
            liste_param = request.getParameter("liste_param");
            new logger().OCategory.info("liste_param->" + request.getParameter("liste_param"));
        }

        if (request.getParameter("table_name") != null) {
            table_name = request.getParameter("table_name");
            new logger().OCategory.info("table_name->" + request.getParameter("table_name"));
        }

        filePath = OMigrationManager.ExportDataFromDataBase(table_name, extension, liste_param);

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

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>
}
