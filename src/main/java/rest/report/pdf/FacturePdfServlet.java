/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import commonTasks.dto.FileForma;
import commonTasks.dto.Params;
import dal.TPrivilege;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import util.Constant;

/**
 *
 * @author DICI
 */
public class FacturePdfServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    @EJB
    Facture facture;

    private enum Action {
        DEVIS, LISTE_DIFFERES, DIFFERE, LOG, VENTE_ANNULEES, FACTURE_PROVISOIRES, ALL_FACTURE_PROVISOIRES,
        DEVIS_FACTURE, VENTE_ANNULEES_PLUS, REGLEMENT_FACTURE_GROUPE
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String query = request.getParameter("query");
        String userId = request.getParameter("userId");
        String tiersPayantId = request.getParameter("tiersPayantId");
        Params params = new Params();
        params.setOperateur(OTUser);
        String file = "";
        if (dtEnd != null && !"".equals(dtEnd)) {
            params.setDtEnd(dtEnd);
        }
        if (dtStart != null && !"".equals(dtStart)) {
            params.setDtStart(dtStart);
        }
        switch (Action.valueOf(action)) {
        case DEVIS:
            String venteId = request.getParameter("venteId");
            file = facture.factureDevis(venteId, OTUser);
            break;
        case LISTE_DIFFERES:
            boolean pairclient = Boolean.parseBoolean(request.getParameter("pairclient"));
            if (!"".equals(query)) {
                params.setDescription(query);
            }
            if (!"".equals(userId)) {
                params.setRef(userId);
            }

            file = facture.listeDifferes(params, pairclient);
            break;
        case DIFFERE:
            String _userId = request.getParameter("userId");
            if (!"".equals(_userId)) {
                params.setRef(_userId);
            }
            file = facture.listeDifferesRegles(params, true);
            break;

        case LOG:
            int criteria = Integer.parseInt(request.getParameter("criteria"));
            file = facture.logs(query, LocalDate.parse(dtStart), LocalDate.parse(dtEnd), userId, criteria, OTUser);
            break;
        case VENTE_ANNULEES:
            List<TPrivilege> LstTPrivilege = (List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE);
            file = facture.annulations(query, LocalDate.parse(dtStart), LocalDate.parse(dtEnd), OTUser, LstTPrivilege);
            break;

        case DEVIS_FACTURE:
            venteId = request.getParameter("venteId");
            FileForma fileForma = FileForma.valueOf(request.getParameter("format"));
            file = facture.factureDevisAsFacture(venteId, fileForma, OTUser);
            break;
        case VENTE_ANNULEES_PLUS:
            List<TPrivilege> LstTPrivilege_ = (List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE);
            file = facture.annulationsPlus(query, LocalDate.parse(dtStart), LocalDate.parse(dtEnd), OTUser,
                    LstTPrivilege_);

            break;
        case REGLEMENT_FACTURE_GROUPE:
            params.setRef(tiersPayantId);
            file = facture.listeReglement(params);
            break;
        default:
            break;
        }
        response.sendRedirect(request.getContextPath() + file);
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

}
