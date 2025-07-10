package rest.report.pdf;

import commonTasks.dto.VenteDTO;
import dal.Caution;
import dal.TTiersPayant;
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
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.CautionTiersPayantService;
import rest.service.dto.CautionHistoriqueDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "CautionServlet", urlPatterns = { "/cautionServlet" })
public class CautionServlet extends HttpServlet {

    @EJB
    private CautionTiersPayantService cautionTiersPayantService;
    @EJB
    private ReportUtil reportUtil;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        String mode = request.getParameter("mode");
        if (mode.equals("historiques")) {
            response.sendRedirect(request.getContextPath() + buildHistoriques(request));
        } else {
            response.sendRedirect(request.getContextPath() + buildAchats(request));
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

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private String buildHistoriques(HttpServletRequest request) {

        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String idCaution = request.getParameter("idCaution");

        String reportName = "rp_historiques_caution_depot";

        List<CautionHistoriqueDTO> datas = this.cautionTiersPayantService.getHistoriques(idCaution, dtStart, dtEnd);
        return reportUtil.buildReport(getParameters(request, "HISTORIQUES DE DEPOTS DE CAUTION DE "), reportName,
                datas);

    }

    private String buildAchats(HttpServletRequest request) {
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String idCaution = request.getParameter("idCaution");
        String reportName = "rp_achats_caution";

        List<VenteDTO> datas = this.cautionTiersPayantService.getVentes(idCaution, dtStart, dtEnd);
        return reportUtil.buildReport(getParameters(request, "LISTE DES ACHATS DE  "), reportName, datas);

    }

    private Map<String, Object> getParameters(HttpServletRequest request, String title) {
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);

        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String idCaution = request.getParameter("idCaution");
        Caution caution = this.cautionTiersPayantService.getCautionById(idCaution);
        TTiersPayant payant = caution.getTiersPayant();
        if (StringUtils.isEmpty(dtStart)) {
            dtStart = LocalDate.now().minusYears(1).toString();
        }
        if (StringUtils.isEmpty(dtEnd)) {
            dtEnd = LocalDate.now().toString();
        }
        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_SOLDE", caution.getMontant());
        parameters.put("P_ACHAT", caution.getConso());
        parameters.put("P_H_CLT_INFOS", title + payant.getStrFULLNAME() + " DU " + periode);
        return parameters;
    }
}
