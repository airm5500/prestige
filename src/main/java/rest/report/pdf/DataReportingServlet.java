/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import commonTasks.dto.SalesStatsParams;
import dal.TPrivilege;
import dal.TUser;
import enumeration.MargeEnum;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang3.StringUtils;
import toolkits.parameters.commonparameter;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class DataReportingServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    @EJB
    DataReporting dataReporting;

    private enum ActionDataReporting {
        MARGE_PRODUITS, UNITES_VENDUES, UNITES_GAMME, UNITES_LABORATOIRES, ARTICLES_NON_VENDUES, ARTICLES_SUR_STOCK,
        COMPARAISON_STOCK, COMPARAISON_STOCK_DETAIL, COMPTE_EXPLOITATION, ALL_AJUSTEMENTS, RETOUR_FOURNISSEUR
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser oTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String fourId = request.getParameter("fourId");
        String codeFamile, codeRayon;
        String codeGrossiste;
        String query = request.getParameter("query");
        String file = "";
        switch (ActionDataReporting.valueOf(action)) {
        case MARGE_PRODUITS:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");

            Integer critere = null;
            if (!StringUtils.isEmpty(request.getParameter("critere"))) {

                critere = Integer.valueOf(request.getParameter("critere"));
            }
            MargeEnum filtre = MargeEnum.valueOf(request.getParameter("filtre"));
            file = dataReporting.margeProduitsVendus(dtStart, dtEnd, codeFamile, critere, query, oTUser, codeRayon,
                    codeGrossiste, filtre);
            break;
        case UNITES_VENDUES:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");

            file = dataReporting.statsUnintesVendues(dtStart, dtEnd, codeFamile, query, oTUser, codeRayon,
                    codeGrossiste);
            break;
        case UNITES_GAMME:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");

            String gammeId = request.getParameter("gammeId");
            file = dataReporting.statsUnintesVenduesparGamme(dtStart, dtEnd, codeFamile, query, oTUser, codeRayon,
                    codeGrossiste, gammeId);
            break;
        case UNITES_LABORATOIRES:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");

            String laboratoireId = request.getParameter("laboratoireId");
            file = dataReporting.statsUnintesVenduesparLaboratoire(dtStart, dtEnd, codeFamile, query, oTUser, codeRayon,
                    codeGrossiste, laboratoireId);
            break;
        case ARTICLES_NON_VENDUES:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");

            Integer stock = 0;
            if (!StringUtils.isEmpty(request.getParameter("stock"))) {
                try {
                    stock = Integer.valueOf(request.getParameter("stock"));
                } catch (Exception e) {
                }

            }
            MargeEnum stockFiltre = MargeEnum.valueOf(request.getParameter("stockFiltre"));
            file = dataReporting.statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, oTUser, codeRayon,
                    codeGrossiste, stock, stockFiltre);
            break;
        case ARTICLES_SUR_STOCK:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");

            codeGrossiste = request.getParameter("codeGrossiste");

            Integer nbreMois = 0, nbreConsommation = 3;
            if (!StringUtils.isEmpty(request.getParameter("nbreMois"))) {
                try {
                    nbreMois = Integer.valueOf(request.getParameter("nbreMois"));
                } catch (Exception e) {
                }

            }
            if (!StringUtils.isEmpty(request.getParameter("nbreConsommation"))) {
                try {
                    nbreConsommation = Integer.valueOf(request.getParameter("nbreConsommation"));
                } catch (Exception e) {
                }

            }
            file = dataReporting.articleSurStock(codeFamile, query, oTUser, codeRayon, codeGrossiste, nbreMois,
                    nbreConsommation);
            break;

        case COMPARAISON_STOCK:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            MargeEnum filtreStock = null;
            MargeEnum filtreSeuil = null;
            try {
                filtreStock = MargeEnum.valueOf(request.getParameter("filtreStock"));
            } catch (Exception e) {
            }
            try {
                filtreSeuil = MargeEnum.valueOf(request.getParameter("filtreSeuil"));
            } catch (Exception e) {
            }
            codeGrossiste = request.getParameter("codeGrossiste");

            stock = 0;
            int seuil = 0;
            try {
                seuil = Integer.parseInt(request.getParameter("seuil"));
            } catch (NumberFormatException e) {
            }
            try {
                stock = Integer.valueOf(request.getParameter("stock"));
            } catch (NumberFormatException e) {
            }
            file = dataReporting.comparaisonStock(oTUser, query, filtreStock, filtreSeuil, codeFamile, codeRayon,
                    codeGrossiste, stock, seuil);
            break;

        case COMPARAISON_STOCK_DETAIL:

            String id = request.getParameter("id");
            String libelle = request.getParameter("libelle");
            String cip = request.getParameter("cip");
            file = dataReporting.produitConsomamation(oTUser, query, dtStart, dtEnd, id, libelle, cip);
            break;
        case COMPTE_EXPLOITATION:
            file = dataReporting.donneesCompteExploitation(dtStart, dtEnd, oTUser);
            break;
        case ALL_AJUSTEMENTS:

            List<TPrivilege> attribute = (List<TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
            boolean canCancel = DateConverter.hasAuthorityByName(attribute, DateConverter.ACTIONDELETEAJUSTEMENT);
            SalesStatsParams body = new SalesStatsParams();
            body.setCanCancel(canCancel);
            body.setShowAll(true);
            body.setAll(false);
            body.setUserId(oTUser);
            body.setQuery(query);
            try {
                body.setTypeFiltre(request.getParameter("typeFiltre"));
            } catch (Exception e) {
            }
            try {
                body.setDtEnd(LocalDate.parse(dtEnd));
                body.setDtStart(LocalDate.parse(dtStart));
            } catch (Exception e) {
            }
            file = dataReporting.ajustements(body);
            break;
        case RETOUR_FOURNISSEUR:

            file = dataReporting.loadretoursFournisseur(dtStart, dtEnd, fourId, query, oTUser,
                    request.getParameter("filtre"));
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
