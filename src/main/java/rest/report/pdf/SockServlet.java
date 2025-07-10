/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import commonTasks.dto.MvtArticleParams;
import commonTasks.dto.SalesStatsParams;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
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
public class SockServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    @EJB
    Stock stockService;

    private enum Action {
        VALORISATION, RUPTURE_PHARMAML, UG, VENTE_TIERS_PAYANT_GROUP, VENTE_TIERS_PAYANT, ARTICLE_VENDUS_DETAIL,
        ARTICLE_VENDUS_RECAP, SUIVI_MVT_PRODUIT
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser tUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String groupeId = request.getParameter("groupeId");
        String tiersPayantId = request.getParameter("tiersPayantId");
        String query = request.getParameter("query");
        String typeTp = request.getParameter("typeTp");
        String file = "";
        String end = request.getParameter("END");
        String begin = request.getParameter("BEGIN");
        String rayonId = request.getParameter("rayonId");
        String search = request.getParameter("search");
        switch (SockServlet.Action.valueOf(action)) {
        case VALORISATION:
            int mode = Integer.parseInt(request.getParameter("action"));
            String lgGROSSISTEID = request.getParameter("lgGROSSISTEID");
            String lgZONEGEOID = request.getParameter("lgZONEGEOID");

            String lgFAMILLEARTICLEID = request.getParameter("lgFAMILLEARTICLEID");
            file = stockService.valorisation(tUser, mode, LocalDate.parse(dtStart), lgGROSSISTEID, lgFAMILLEARTICLEID,
                    lgZONEGEOID, end, begin, tUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            break;

        case RUPTURE_PHARMAML:
            query = request.getParameter("query");
            String grossisteId = request.getParameter("grossisteId");
            file = stockService.rupturePharmaMl(tUser, LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query,
                    grossisteId, tUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            break;

        case UG:
            file = stockService.venteUgDTO(tUser, LocalDate.parse(dtStart), LocalDate.parse(dtEnd), null);
            break;
        case VENTE_TIERS_PAYANT_GROUP:
            file = stockService.ventesTiersPayants(tUser, "rp_ventetpGroup", query, dtStart, dtEnd, tiersPayantId,
                    groupeId, typeTp);
            break;
        case VENTE_TIERS_PAYANT:
            file = stockService.ventesTiersPayants(tUser, "rp_ventetp", query, dtStart, dtEnd, tiersPayantId, groupeId,
                    typeTp);
            break;
        case ARTICLE_VENDUS_DETAIL:
        case ARTICLE_VENDUS_RECAP:
            String user = request.getParameter("user");
            int stock = 0;
            int nbre = 0;
            Integer qteVendu = null;
            try {
                stock = Integer.parseInt(request.getParameter("stock"));
            } catch (Exception e) {
            }
            try {
                nbre = Integer.parseInt(request.getParameter("nbre"));
            } catch (Exception e) {
            }
            try {
                qteVendu = Integer.valueOf(request.getParameter("qteVendu"));
            } catch (Exception e) {
            }

            String typeTransaction = request.getParameter("typeTransaction");
            String stockFiltre = request.getParameter("stockFiltre");
            String prixachatFiltre = request.getParameter("prixachatFiltre");

            String hEnd = request.getParameter("hEnd");
            String hStart = request.getParameter("hStart");
            String type = request.getParameter("type");
            SalesStatsParams body = new SalesStatsParams();
            body.setUserId(tUser);
            body.setUser(user);
            body.setQuery(query);
            body.setStatut(Constant.STATUT_IS_CLOSED);
            body.setAll(true);
            body.setStock(stock);
            body.setRayonId(rayonId);
            body.setTypeTransaction(typeTransaction);
            body.setStockFiltre(stockFiltre);
            body.setPrixachatFiltre(prixachatFiltre);
            body.setNbre(nbre);
            body.setQteVendu(qteVendu);
            try {
                body.setDtEnd(LocalDate.parse(dtEnd));
            } catch (Exception e) {
            }
            try {
                body.sethEnd(LocalTime.parse(hEnd));
            } catch (Exception e) {
            }
            try {
                body.sethStart(LocalTime.parse(hStart));
            } catch (Exception e) {
            }
            try {
                body.setDtStart(LocalDate.parse(dtStart));

            } catch (Exception e) {
            }
            file = stockService.articlesVendusRecap(body, action, type);
            break;
        case SUIVI_MVT_PRODUIT:
            String categorieId = request.getParameter("categorieId");
            String fabricantId = request.getParameter("fabricantId");
            MvtArticleParams articleParams = new MvtArticleParams();
            articleParams.setAll(true);
            articleParams.setDtStart(LocalDate.parse(dtStart));
            articleParams.setDtEnd(LocalDate.parse(dtEnd));
            articleParams.setSearch(search);
            articleParams.setFabricantId(fabricantId);
            articleParams.setCategorieId(categorieId);
            articleParams.setMagasinId(tUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            file = stockService.suivitMvtArcticle(articleParams, tUser);
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
