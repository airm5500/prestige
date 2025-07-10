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
        response.setContentType("application/pdf");
        response.sendRedirect(request.getContextPath() + buildReport(request));

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

        boolean checked = Boolean.parseBoolean(request.getParameter("checked"));
        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        String reportName = "rp_mvt_caisse";

        parameters.put("P_H_CLT_INFOS", "LISTE DES MOUVEMENTS DE CAISSE \n DU  " + periode);
        List<rest.service.dto.MvtCaisseDTO> datas = this.caisseService.getAllMvtCaisses(dtStart, dtEnd, checked, userId,
                0, 0, true);
        MvtCaisseSummaryDTO caisseSummary = this.caisseService.getAllMvtCaissesSummary(dtStart, dtEnd, userId, checked);
        if (Objects.nonNull(caisseSummary)) {
            parameters.put("modes", caisseSummary.getModes());
        }
        return reportUtil.buildReport(parameters, reportName, datas);

    }

}
