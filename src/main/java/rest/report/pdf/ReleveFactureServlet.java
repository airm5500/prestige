package rest.report.pdf;

import commonTasks.dto.ReportTypeTiersPayantFactureDTO;
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
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.FacturationService;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "ReleveFactureServlet", urlPatterns = { "/releveFactureServlet" })
public class ReleveFactureServlet extends HttpServlet {

    @EJB
    private ReportUtil reportUtil;
    @EJB
    private FacturationService facturationService;

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
    private String buildReport(HttpServletRequest request) {

        String searchTerm = request.getParameter("search_value");
        String tiersPayantId = request.getParameter("lg_customer_id");
        String invoiceFilter = request.getParameter("impayes");
        String codeFacture = request.getParameter("codeFacture");
        String dtStart = request.getParameter("dt_debut");
        String dtEnd = request.getParameter("dt_fin");
        String reportName = "rp_releve_factures";
        String info = StringUtils.isEmpty(tiersPayantId) ? ""
                : "SAUF ERREUR DE NOTRE PART LE REGLEMENT DE VOS FACTURES CI-DESSUS RELEVES NE NOUS EST PAS ENCORE PARVENU. NOUS VOUS PRIONS DE BIEN VOULOIR NOUS LES REGLER A VOTRE CONVENANCE DANS LES DELAIS";

        ReportTypeTiersPayantFactureDTO datas = facturationService.exportReleveFacture(invoiceFilter, tiersPayantId,
                codeFacture, searchTerm, dtStart, dtEnd);
        return reportUtil.buildReport(getParameters(request, "RELEVE DES FACTURES CLIENTS EN COMPTE PERIODE DU ",
                dtStart, dtEnd, info, datas), reportName, datas.getTierspayants());

    }

    private Map<String, Object> getParameters(HttpServletRequest request, String title, String dtStart, String dtEnd,
            String info, ReportTypeTiersPayantFactureDTO datas) {
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);

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
        parameters.put("P_H_CLT_INFOS", title + periode);
        parameters.put("P_NOTE_MONTANT", info);
        parameters.put("P_MONTANT_FACTURE", datas.getMontantFacture());
        parameters.put("P_MONTANT_REGLE", datas.getMontantRegle());
        parameters.put("P_MONTANT_RESTANT", datas.getMontantRestant());
        return parameters;
    }
}
