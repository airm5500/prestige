
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
        String tiersPayantId = request.getParameter("tiersPayantId");
        String hEnd = request.getParameter("hEnd");
        String hStart = request.getParameter("hStart");
        String search = request.getParameter("search");
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
                .tiersPayantId(tiersPayantId).all(true).search(search).dtEnd(dtEnd).showAllAmount(true)
                .emplacementId(user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build();
        List<BonsDTO> datas = this.listDesBonService.listAllBons(bonsParam);
        BonsTotauxDTO bonsTotaux = this.listDesBonService.listBonsTotaux(bonsParam);
        parameters.put("montant", bonsTotaux.getMontant());
        parameters.put("nbreBon", bonsTotaux.getNbreBon());
        return reportUtil.buildReport(parameters, reportName, datas);

    }
}
