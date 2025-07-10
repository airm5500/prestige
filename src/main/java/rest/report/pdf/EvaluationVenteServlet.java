package rest.report.pdf;

import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import rest.report.ReportUtil;
import rest.service.EvaluationVenteService;
import rest.service.dto.EvaluationVenteDto;
import rest.service.dto.EvaluationVenteFiltre;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "EvaluationVenteServlet", urlPatterns = { "/EvaluationVenteServlet" })
public class EvaluationVenteServlet extends HttpServlet {

    @EJB
    private EvaluationVenteService evaluationVenteService;
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
        String pattern = "MM/yyyy";
        String familleId = request.getParameter("familleId");
        String emplacementId = request.getParameter("emplacementId");
        String filtreValue = request.getParameter("filtreValue");
        String filtre = request.getParameter("filtre");
        String query = request.getParameter("query");
        LocalDate dtSt = LocalDate.now();
        LocalDate dtd = dtSt.minusMonths(3).withDayOfMonth(1);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU "
                + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        String reportName = "rp_evaluation_vente";

        parameters.put("P_H_CLT_INFOS", "EVALUATION DES VENTE \n DU  " + periode);
        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setQuery(query);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(Objects.nonNull(filtreValue) ? Float.valueOf(filtreValue) : null);
        List<EvaluationVenteDto> datas = this.evaluationVenteService.getEvaluationVentes(evaluationVenteFiltre);

        parameters.put("quantiteVendueCurrentMonth", dtSt.format(DateTimeFormatter.ofPattern(pattern)));
        parameters.put("quantiteVendueMonthMinusOne", dtSt.minusMonths(1).format(DateTimeFormatter.ofPattern(pattern)));
        parameters.put("quantiteVendueMonthMinusTwo", dtSt.minusMonths(2).format(DateTimeFormatter.ofPattern(pattern)));
        parameters.put("quantiteVendueMonthMinusThree",
                dtSt.minusMonths(3).format(DateTimeFormatter.ofPattern(pattern)));
        return reportUtil.buildReport(parameters, reportName, datas);

    }
}
