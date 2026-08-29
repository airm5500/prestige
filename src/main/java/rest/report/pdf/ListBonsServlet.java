
package rest.report.pdf;

import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import rest.report.ReportUtil;
import rest.service.ListDesBonService;
import rest.service.dto.BonsDTO;
import rest.service.dto.BonsParam;
import rest.service.dto.BonsTotauxDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "ListBonsServlet", urlPatterns = { "/ListBonsServlet" })
public class ListBonsServlet extends HttpServlet {
    @EJB
    private ListDesBonService listDesBonService;
    @EJB
    private ReportUtil reportUtil;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");

        String mode = request.getParameter("mode");
        String groupeId = request.getParameter("groupeId");
        boolean avecProduits = "produits".equalsIgnoreCase(mode);
        boolean parGroupe = groupeId != null && !groupeId.trim().isEmpty();
        if (avecProduits || parGroupe) {
            // Lot 3 : PDF construit en code (liste avec produits, et/ou regroupe par groupe
            // de tiers payant) — le gabarit jasper historique reste la « liste simple ».
            byte[] pdf = buildCodePdf(request, avecProduits, parGroupe);
            response.setHeader("Content-Disposition", "inline; filename=\"liste_bons.pdf\"");
            response.setContentLength(pdf.length);
            response.getOutputStream().write(pdf);
            response.getOutputStream().flush();
            return;
        }
        response.sendRedirect(request.getContextPath() + buildReport(request));

    }

    private BonsParam bonsParamFromRequest(HttpServletRequest request, TUser user) {
        String search = request.getParameter("query");
        if (search == null || search.trim().isEmpty()) {
            search = request.getParameter("search");
        }
        return BonsParam.builder().dtStart(request.getParameter("dtStart")).dtEnd(request.getParameter("dtEnd"))
                .hStart(request.getParameter("hStart")).hEnd(request.getParameter("hEnd"))
                .tiersPayantId(request.getParameter("tiersPayantId"))
                .typeTiersPayantId(request.getParameter("typeTiersPayantId")).groupeId(request.getParameter("groupeId"))
                .all(true).search(search).showAllAmount(true)
                .emplacementId(user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build();
    }

    private byte[] buildCodePdf(HttpServletRequest request, boolean avecProduits, boolean parGroupe) {
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = periode(request.getParameter("dtStart"), request.getParameter("dtEnd"));
        String entete = String.valueOf(parameters.getOrDefault("P_H_INSTITUTION", ""));
        String imprimePar = String.valueOf(parameters.getOrDefault("P_PRINTED_BY", ""));
        return listDesBonService.buildBonsPdf(bonsParamFromRequest(request, user), avecProduits, parGroupe, entete,
                "DU " + periode, imprimePar);
    }

    private String periode(String dtStart, String dtEnd) {
        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        return periode;
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

    public String buildReport(HttpServletRequest request) {
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);

        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String tiersPayantId = request.getParameter("tiersPayantId");
        String hEnd = request.getParameter("hEnd");
        String hStart = request.getParameter("hStart");
        // L'ecran envoie le texte de recherche sous le nom "query" (c'est aussi celui que
        // recoit l'API de la grille). Ce servlet ne lisait que "search" : le PDF ignorait
        // donc le filtre saisi et sortait TOUS les bons de la periode, alors que l'ecran,
        // lui, n'en montrait qu'une partie. On accepte les deux noms.
        String search = request.getParameter("query");
        if (search == null || search.trim().isEmpty()) {
            search = request.getParameter("search");
        }
        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        String reportName = "rp_facture_subro";

        parameters.put("P_H_CLT_INFOS", "LISTE DES BONS \n DU  " + periode);
        BonsParam bonsParam = BonsParam.builder().dtStart(dtStart).hStart(hStart).hEnd(hEnd)
                .tiersPayantId(tiersPayantId).typeTiersPayantId(request.getParameter("typeTiersPayantId")).all(true)
                .search(search).dtEnd(dtEnd).showAllAmount(true)
                .emplacementId(user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build();
        List<BonsDTO> datas = this.listDesBonService.listAllBons(bonsParam);
        BonsTotauxDTO bonsTotaux = this.listDesBonService.listBonsTotaux(bonsParam);
        parameters.put("montant", bonsTotaux.getMontant());
        parameters.put("nbreBon", bonsTotaux.getNbreBon());
        return reportUtil.buildReport(parameters, reportName, datas);

    }
}
