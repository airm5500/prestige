/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import org.json.JSONObject;
import rest.service.ImportationInventaire;

@WebServlet(name = "ImportInventaire", urlPatterns = { "/ImportInventaire" })
@MultipartConfig(fileSizeThreshold = 5242880, maxFileSize = 20971520L, maxRequestSize = 41943040L)
public class ImportInventaire extends HttpServlet {

    @EJB
    private ImportationInventaire importationInventaire;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");

        String lgINVENTAIREID = request.getParameter("lg_INVENTAIRE_ID");
        Part part = request.getPart("str_FILE");
        String fileName = part.getSubmittedFileName();
        String extension = fileName.substring(fileName.indexOf(".") + 1, fileName.length());
        JSONObject jsonO;

        try (PrintWriter out = response.getWriter()) {
            if (extension.equals("csv")) {
                jsonO = bulkUpdate(part, lgINVENTAIREID);
                jsonO.put("statut", 1);
                jsonO.put("success", "<span style='color:blue;font-weight:800;'>" + jsonO.getInt("count") + "/"
                        + jsonO.getInt("ligne") + "</span> produits mis à jour");
            } else {
                jsonO = bulkUpdateWithExcel(part, lgINVENTAIREID);
                jsonO.put("statut", 1);

                jsonO.put("success", "<span style='color:blue;font-weight:800;'>" + jsonO.getInt("count") + "/"
                        + jsonO.getInt("ligne") + "</span> produits mis à jour");
            }

            out.println(jsonO.toString());
        } catch (Exception ex) {
            Logger.getLogger(ImportInventaire.class.getName()).log(Level.SEVERE, null, ex);
        }
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

    private JSONObject bulkUpdate(Part part, String id) throws Exception {

        return importationInventaire.bulkUpdate(part, id);
    }

    private JSONObject bulkUpdateWithExcel(Part part, String id) throws Exception {

        return importationInventaire.bulkUpdateWithExcel(part, id);
    }

}
