/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package fileupload;

import bll.common.Parameter;
import bll.migration.MigrationManager;
import dal.TUser;
import dal.dataManager;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Iterator;
import java.util.List;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class CheckMigrationServlet extends HttpServlet {

    // Create a JSON object to send response
    JSONObject json = new JSONObject();

    private static final long serialVersionUID = 1L;
    // private static final String TMP_DIR_PATH = "/tempfiles";
    private static String TMP_DIR_PATH = "";
    private File tmpDir;
    // private static final String DESTINATION_DIR_PATH = "/files";
    private static String DESTINATION_DIR_PATH = "";
    private File destinationDir;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        TMP_DIR_PATH = jdom.path_file_generate_relatif_imported + "csv/";
        DESTINATION_DIR_PATH = jdom.path_file_generate_relatif_imported + "csv/";
        String realPath = getServletContext().getRealPath(TMP_DIR_PATH);
        tmpDir = new File(realPath);
        if (!tmpDir.isDirectory()) {
            throw new ServletException(TMP_DIR_PATH + " is not a directory");
        }

        realPath = getServletContext().getRealPath(DESTINATION_DIR_PATH);
        destinationDir = new File(realPath);
        if (!destinationDir.isDirectory()) {
            throw new ServletException(DESTINATION_DIR_PATH + " is not a directory");
        }

    }

    public CheckMigrationServlet() {
        super();
        jdom.InitRessource();
        jdom.LoadRessource();
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String filePath = "", table_name = Parameter.TABLE_FAMILLE, extension = "", str_FILE = "", format = "";
        response.setContentType("text/html;charset=UTF-8");
        dataManager ODataManager = new dataManager();
        ODataManager.initEntityManager();
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

        new logger().OCategory.info("Utilisateur connecté");
        MigrationManager OMigrationManager = new MigrationManager(ODataManager, OTUser);

        if (request.getParameter("table_name") != null) {
            table_name = request.getParameter("table_name");
            new logger().OCategory.info("table_name->" + request.getParameter("table_name"));
        }

        if (request.getParameter("format") != null) {
            format = request.getParameter("format");
            new logger().OCategory.info("format->" + format);
        }

        DiskFileItemFactory fileItemFactory = new DiskFileItemFactory();

        // Set the size threshold, above which content will be stored on disk.
        fileItemFactory.setSizeThreshold(3 * 1024 * 1024); // 3 MB

        // Set the temporary directory to store the uploaded files of size above threshold.
        fileItemFactory.setRepository(tmpDir);
        ServletFileUpload uploadHandler = new ServletFileUpload(fileItemFactory);

        try {

            // Parse the request
            List items = uploadHandler.parseRequest(request);
            Iterator iterator = items.iterator();
            while (iterator.hasNext()) {
                FileItem item = (FileItem) iterator.next();

                // Handle Form Fields
                if (item.isFormField()) {
                    /*
                     * if (item.getFieldName().equalsIgnoreCase("table_name")) { table_name = item.getString(); new
                     * logger().OCategory.info("table_name  " + table_name); }
                     */
                } // Handle Uploaded files.
                else {
                    System.out.println("Field Name = " + item.getFieldName() + ", File Name = " + item.getName()
                            + ", Content type = " + item.getContentType() + ", File Size = " + item.getSize());
                    if (item.getFieldName().equalsIgnoreCase("str_FILE")) {
                        str_FILE = item.getName();
                        new logger().OCategory.info("str_FILE  " + str_FILE);
                    }
                    // Write file to the ultimate location.
                    int dotPos = str_FILE.lastIndexOf(".");
                    extension = str_FILE.substring(dotPos);
                    new logger().OCategory.info("extension  " + extension + " chemin " + destinationDir + str_FILE);
                    if (extension.equalsIgnoreCase(".csv") || extension.equalsIgnoreCase(".xls")
                            || extension.equalsIgnoreCase(".xlsx")) {
                        File file = new File(destinationDir, str_FILE);
                        item.write(file);
                    } else {
                        OMigrationManager.buildErrorTraceMessage("Format de fichier non valide");
                    }

                }
            }
            filePath = OMigrationManager.CheckDataToDataBase(table_name,
                    destinationDir + "\\" + str_FILE.substring(0, str_FILE.length() - extension.length()), extension,
                    format);

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

        } catch (FileUploadException ex) {
            log("Error encountered while parsing the request", ex);
        } catch (Exception ex) {
            log("Error encountered while uploading file", ex);
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
    }// </editor-fold>
}
