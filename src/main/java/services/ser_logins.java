/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package services;

import dal.TUser;
import dal.dataManager;
import java.io.IOException;
import java.io.PrintWriter;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.JSONArray;
import org.json.JSONObject;
import bll.userManagement.authentification;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.json.JSONException;

/**
 *
 * @author user
 */
public class ser_logins extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code> methods.
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
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, JSONException {
        response.setContentType("text/html;charset=UTF-8");
        PrintWriter out = response.getWriter();
        try {
            String Str_PASSWORD = "";
            String str_LOGIN = "";

            JSONObject json = new JSONObject();
            JSONArray arrayObj = new JSONArray();
            if ((request.getParameter("Str_PASSWORD") != null)) {
                Str_PASSWORD = request.getParameter("Str_PASSWORD").toString();

            }
            if ((request.getParameter("str_LOGIN") != null)) {
                str_LOGIN = request.getParameter("str_LOGIN").toString();
            }

            dataManager OdataManager = new dataManager();
            OdataManager.initEntityManager();

            authentification Oauthentification = new authentification(OdataManager);

            if (!Oauthentification.loginUser(Str_PASSWORD, str_LOGIN)) {
                Oauthentification.setMessage(toolkits.parameters.commonparameter.PROCESS_FAILED);
            } else {
                Oauthentification.setDetailmessage(Oauthentification.getMessage());
                Oauthentification.setMessage(toolkits.parameters.commonparameter.PROCESS_SUCCESS);

            }

            json.put("desc_statut", Oauthentification.getDetailmessage());
            json.put("code_statut", Oauthentification.getMessage());

            if (Oauthentification.getMessage().equals("1")) {
                TUser OTUser = Oauthentification.getOTUser();
                json.put("str_LOGIN", Oauthentification.getOTUser().getStrLOGIN());
                json.put("str_USER_ID", Oauthentification.getOTUser().getLgUSERID());
                json.put("str_FIRST_NAME", Oauthentification.getOTUser().getStrFIRSTNAME());
                json.put("str_LAST_NAME", Oauthentification.getOTUser().getStrLASTNAME());
                json.put("str_PHONE", Oauthentification.getOTUser().getStrPHONE());

            }

            Oauthentification.getOdataManager().closeEntityManager();
            arrayObj.put(json);
            // String jsonData = new JsonDataCreator().getJsonPeopleString();
            String jsonData = arrayObj.toString();
            // PrintWriter out = response.getWriter();
            // session.setAttribute("jsondata", jsonData);
            boolean scriptTag = false;
            String cb = request.getParameter("callback");
            if (cb != null) {
                scriptTag = true;
                response.setContentType("text/javascript");
            } else {
                response.setContentType("application/x-json");
            }
            if (scriptTag) {
                out.write(cb + "(");
            }
            System.out.println(jsonData);
            out.println(jsonData);
            if (scriptTag) {
                out.write(");");
            }
        } finally {
            out.close();
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
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(ser_logins.class.getName()).log(Level.SEVERE, null, ex);
        }
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
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(ser_logins.class.getName()).log(Level.SEVERE, null, ex);
        }
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
