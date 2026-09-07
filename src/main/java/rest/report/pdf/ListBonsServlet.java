
package rest.report.pdf;

import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
import rest.service.dto.BonsParam;
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
        /*
         * Point 14 : les DEUX editions passent desormais par le meme constructeur, celui du code.
         *
         * La « liste simple » etait la seule a passer par jasper, avec l'etat « rp_facture_subro ». Cet etat n'existe
         * nulle part : ni dans les sources, ni installe sur le serveur. La redirection renvoyait donc une URL vers un
         * fichier jamais ecrit, c'est-a-dire un 404 -- meme piege que ca_zone_geo. Passer par le code corrige ce 404 ET
         * donne aux deux editions exactement la meme mise en forme, ce qui est precisement ce qui est demande.
         */
        byte[] pdf = buildCodePdf(request, avecProduits, parGroupe);
        response.setHeader("Content-Disposition", "inline; filename=\"liste_bons.pdf\"");
        response.setContentLength(pdf.length);
        response.getOutputStream().write(pdf);
        response.getOutputStream().flush();
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

}
