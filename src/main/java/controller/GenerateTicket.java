/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import bll.preenregistrement.Preenregistrement;
import cust_barcode.barecodeManager;
import dal.TPreenregistrement;
import dal.TUser;
import dal.dataManager;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;

/**
 *
 *
 */
@WebServlet(name = "GenerateTicket", urlPatterns = { "/generateTicket" })
public class GenerateTicket extends HttpServlet {

    private final static Logger LOGGER = Logger.getLogger(GenerateTicket.class.getName());

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, JSONException {

        jdom.InitRessource();
        jdom.LoadRessource();
        dataManager OdataManager = new dataManager();
        OdataManager.initEntityManager();
        // EntityManager entityManager = OdataManager.getEm();
        response.setContentType("application/json;charset=UTF-8");
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        String action = request.getParameter("mode");

        String lg_PREENREGISTREMENT_ID = "", str_FIRST_NAME_FACTURE = "", str_LAST_NAME_FACTURE = "",
                int_NUMBER_FACTURE = "";

        JSONObject json = new JSONObject();

        if (request.getParameter("lg_PREENREGISTREMENT_ID") != null) {
            lg_PREENREGISTREMENT_ID = request.getParameter("lg_PREENREGISTREMENT_ID");

        }

        if (request.getParameter("str_FIRST_NAME_FACTURE") != null) {
            str_FIRST_NAME_FACTURE = request.getParameter("str_FIRST_NAME_FACTURE");

        }

        if (request.getParameter("str_LAST_NAME_FACTURE") != null) {
            str_LAST_NAME_FACTURE = request.getParameter("str_LAST_NAME_FACTURE");

        }

        if (request.getParameter("int_NUMBER_FACTURE") != null) {
            int_NUMBER_FACTURE = request.getParameter("int_NUMBER_FACTURE");

        }
        try (PrintWriter out = response.getWriter()) {
            Preenregistrement OPreenregistrement = new Preenregistrement(OdataManager, OTUser);

            barecodeManager obarecodeManager = new barecodeManager();
            TPreenregistrement oTPreenregistrement = OdataManager.getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            OdataManager.getEm().refresh(oTPreenregistrement);
            LOGGER.log(Level.INFO, "find oTPreenregistrement {0}", oTPreenregistrement);
            String fileBarecode = obarecodeManager.buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            LOGGER.log(Level.INFO, " jdom.barecode_file  {0}", jdom.barecode_file + "" + fileBarecode + ".png");
            if (fileBarecode != null) {
                OPreenregistrement.lunchPrinterForTicket(oTPreenregistrement,
                        jdom.barecode_file + "" + fileBarecode + ".png");
                json.put("success", OPreenregistrement.getMessage());
                json.put("errors", OPreenregistrement.getDetailmessage());
            } else {
                json.put("success", 0);
                json.put("errors",
                        "Erreur de génération du ticket,une erreur c'est produite ,veuillez résaissir la vente.");
            }

            out.println(json);
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(GenerateTicket.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(GenerateTicket.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}
