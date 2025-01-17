package controller;

import dal.TUser;
import dal.enumeration.TypeTransaction;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CaisseService;
import rest.service.impl.FlagService;
import toolkits.parameters.commonparameter;
import util.DateConverter;

@WebServlet(name = "Custom", urlPatterns = {"/custom"})
public class Custom extends HttpServlet {

    @EJB
    private CaisseService caisseService;
    TUser OTUser = null;
    @EJB
    private FlagService flagService;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        HttpSession session = request.getSession();
        OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        String dt_start = LocalDate.now().toString(), dt_end = dt_start;
        Integer virtualAmount = 0;
        if (request.getParameter("dt_start") != null && !"".equalsIgnoreCase(request.getParameter("dt_start"))) {
            dt_start = request.getParameter("dt_start");
        }
        if (request.getParameter("dt_end") != null && !"".equalsIgnoreCase(request.getParameter("dt_end"))) {
            dt_end = request.getParameter("dt_end");
        }
        JSONObject json = new JSONObject();
        try ( PrintWriter out = response.getWriter()) {
            if (!caisseService.key_Params()) {
                out.println(json);
                return;
            }
            if (request.getParameter("action").equals("getca")) {
                Integer ca = caisseService.montantCa(LocalDate.parse(dt_start), LocalDate.parse(dt_end), true, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), TypeTransaction.VENTE_COMPTANT, DateConverter.MODE_ESP);
                if (ca != null) {
                    json.put("CA", ca);
                    json.put("success", true);
                } else {
                    json.put("CA", 0);
                    json.put("success", true);
                }
            } else if (request.getParameter("action").equals("finish")) {
                json.put("success", 0);
                if (request.getParameter("amount") != null && !"".equalsIgnoreCase(request.getParameter("amount"))) {
                    virtualAmount = Integer.valueOf(request.getParameter("amount"));
                    if (virtualAmount.compareTo(0) == 0) {
                        out.println(json);

                    } else {
                        json = flagService.saveFlag(dt_start, dt_end, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), virtualAmount);
                    }
                }

            }

            out.println(json);
        } catch (JSONException ex) {
            Logger.getLogger(Custom.class.getName()).log(Level.SEVERE, null, ex);
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
