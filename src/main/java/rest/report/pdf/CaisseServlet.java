package rest.report.pdf;

import dal.TOfficine;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import rest.report.ReportUtil;
import rest.service.CaisseService;
import rest.service.dto.MvtCaisseSummaryDTO;
import util.Constant;

/**
 *
 * @author koben
 */
public class CaisseServlet extends HttpServlet {

    @EJB
    private CaisseService caisseService;
    @EJB
    private ReportUtil reportUtil;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // Retours des tests du 12/09 (point 3) : l'edition est servie en flux, dans l'onglet ouvert par le clic,
        // comme les autres editions ; la redirection vers le fichier genere n'aboutissait pas partout.
        String url = buildReport(request);
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.isFile()) {
            response.setContentType("text/html;charset=UTF-8");
            response.getWriter()
                    .write("<html><head><meta charset=\"UTF-8\"></head>"
                            + "<body style=\"font-family:Arial,sans-serif;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>");
            return;
        }
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "inline; filename=\"" + fichier.getName() + "\"");
        response.setContentLengthLong(fichier.length());
        java.nio.file.Files.copy(fichier.toPath(), response.getOutputStream());
        response.getOutputStream().flush();
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
        String userId = request.getParameter("userId");
        String typeMvtId = request.getParameter("typeMvtId");
        if ("null".equals(typeMvtId)) {
            typeMvtId = "";
        }

        boolean checked = Boolean.parseBoolean(request.getParameter("checked"));
        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        // Retours des tests du 12/09 (point 3) : nouvelle presentation sur son propre modele embarque
        // mouvements_caisse.jrxml (l'ancien rp_mvt_caisse installe sur site n'est plus utilise).
        String reportName = "mouvements_caisse";

        parameters.put("P_H_CLT_INFOS", "LISTE DES MOUVEMENTS DE CAISSE \n DU  " + periode);
        parameters.put("P_PERIODE", (dtSt.isEqual(dtd) ? "Le " : "Du ") + periode.replace(" AU ", " au "));
        parameters.put("P_FILTRES", EditionMouvementsCaisse.filtresLisibles(userId, typeMvtId, checked));
        List<rest.service.dto.MvtCaisseDTO> datas = this.caisseService.getAllMvtCaisses(dtStart, dtEnd, checked, userId,
                typeMvtId, 0, 0, true);
        MvtCaisseSummaryDTO caisseSummary = this.caisseService.getAllMvtCaissesSummary(dtStart, dtEnd, userId,
                typeMvtId, checked);
        if (Objects.nonNull(caisseSummary)) {
            parameters.put("modes", caisseSummary.getModes());
            parameters.put("P_MODES", EditionMouvementsCaisse.modesLisibles(caisseSummary));
        }
        return reportUtil.buildReport(parameters, reportName, datas, "mouvements_caisse");
    }

}
