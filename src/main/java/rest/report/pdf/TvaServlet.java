package rest.report.pdf;

import commonTasks.dto.Params;
import commonTasks.dto.TvaDTO;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
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
import rest.service.BalanceService;
import rest.service.TvaDataService;
import rest.service.dto.BalanceParamsDTO;
import toolkits.utils.jdom;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "TvaServlet", urlPatterns = { "/TvaServlet" })
public class TvaServlet extends HttpServlet {

    @EJB
    private ReportUtil reportUtil;
    @EJB
    private TvaDataService tvaDataService;
    @EJB
    private BalanceService balanceService;

    private enum TvaAction {
        TVA, TVA_JOUR, TVA_WITH_CRITERIA, TVA_JOUR_WITH_CRITERIA
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String ref = request.getParameter("ref");
        boolean checkug = false;
        try {
            checkug = Boolean.parseBoolean(request.getParameter("checkug"));
        } catch (Exception e) {
        }
        Params params = new Params();
        params.setRef(ref);
        params.setOperateur(OTUser);
        String file = "";
        if (StringUtils.isNotEmpty(dtEnd)) {
            params.setDtEnd(dtEnd);
        }
        if (StringUtils.isNotEmpty(dtStart)) {
            params.setDtStart(dtStart);
        }

        params.setCheckug(checkug);
        if (this.balanceService.useLastUpdateStats()) {
            file = tvaPdf(BalanceParamsDTO.builder().dtEnd(params.getDtEnd()).dtStart(params.getDtStart())
                    .emplacementId(OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .vnoOnly(StringUtils.isNotBlank(ref) && !"TOUT".equalsIgnoreCase(ref))
                    .byDay("TVA_JOUR".equals(action)).build(), OTUser);
        } else {
            switch (TvaAction.valueOf(action)) {
            case TVA:
                file = tvaPdf(params);
                break;
            case TVA_WITH_CRITERIA:
                file = tvaPdfWithCriteria(params);
                break;
            case TVA_JOUR:
                file = tvaPdfGroupByJour(params);
                break;
            default:
                break;
            }
        }

        response.sendRedirect(request.getContextPath() + file);
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

    public String tvaPdfWithCriteria(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_tvastat";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_MM_dd_HH_mm_ss"))
                + ".pdf";
        List<TvaDTO> datas;

        if (!tvaDataService.isExcludTiersPayantActive()) {
            datas = tvaDataService.statistiqueTvaWithSomeCriteria(parasm);
        } else {
            datas = tvaDataService.statistiqueTvaWithSomeTiersPayantToExclude(parasm);
        }
        datas.sort(Comparator.comparing(TvaDTO::getTaux));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "tvastat_" + report_generate_file, datas);
        return "/data/reports/pdf/tvastat_" + report_generate_file;
    }

    public String tvaPdf(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_tvastat";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);

        List<TvaDTO> datas;
        if (StringUtils.isNotBlank(parasm.getRef()) && !parasm.getRef().equalsIgnoreCase("TOUT")) {

            datas = tvaDataService.tvaVnoDatas(parasm);
        } else {
            datas = tvaDataService.statistiqueTva(parasm);
        }

        datas.sort(Comparator.comparing(TvaDTO::getTaux));
        return reportUtil.buildReport(parameters, scr_report_file, datas);

    }

    public String tvaPdfGroupByJour(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_tvastatjour";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_MM_dd_HH_mm_ss"))
                + ".pdf";
        List<TvaDTO> datas;
        if (StringUtils.isNotBlank(parasm.getRef()) && !parasm.getRef().equalsIgnoreCase("TOUT")) {
            datas = tvaDataService.statistiqueTvaVnoGroupByDayTva(parasm);
        } else {
            datas = tvaDataService.statistiqueGroupByDayTva(parasm);
        }

        datas.sort(Comparator.comparing(TvaDTO::getTaux));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "tvastat_" + report_generate_file, datas);
        return "/data/reports/pdf/tvastat_" + report_generate_file;
    }

    public String tvaPdf(BalanceParamsDTO balanceParams, TUser tu) throws IOException {

        LocalDate dtSt = LocalDate.parse(balanceParams.getDtStart());
        LocalDate dtEn = LocalDate.parse(balanceParams.getDtEnd());

        String scr_report_file = "rp_tvastat";
        if (balanceParams.isByDay()) {
            scr_report_file = "rp_tvastatjour";
        }
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);

        List<TvaDTO> datas = this.balanceService.statistiqueTva(balanceParams);

        return reportUtil.buildReport(parameters, scr_report_file, datas);

    }
}
