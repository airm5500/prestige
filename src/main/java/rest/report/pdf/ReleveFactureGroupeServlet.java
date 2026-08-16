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
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.ReleveGroupeFactureService;
import rest.service.dto.ReleveGroupeFactureDTO;
import util.Constant;

/**
 * Releve des factures de groupe, edite depuis le menu Facture de groupe.
 *
 * Meme presentation que le releve des factures clients en compte, mais une ligne par facture de groupe et un bloc par
 * groupe de tiers payants. Les filtres sont ceux de l'ecran : periode, groupe selectionne et texte recherche.
 *
 * @author koben
 */
@WebServlet(name = "ReleveFactureGroupeServlet", urlPatterns = { "/releveFactureGroupeServlet" })
public class ReleveFactureGroupeServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @EJB
    private ReportUtil reportUtil;
    @EJB
    private ReleveGroupeFactureService releveGroupeFactureService;

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
        return "Releve des factures de groupe";
    }

    private String buildReport(HttpServletRequest request) {
        String dtStart = defautDebut(request.getParameter("dt_start"));
        String dtEnd = defautFin(request.getParameter("dt_end"));
        String search = request.getParameter("search_value");
        String codeFacture = request.getParameter("CODEGROUPE");
        Integer idGroupe = entier(request.getParameter("lg_GROUPE_ID"));

        ReleveGroupeFactureDTO datas = releveGroupeFactureService.releve(dtStart, dtEnd, idGroupe, search, codeFacture);

        return reportUtil.buildReport(getParameters(request, dtStart, dtEnd, datas), "rp_releve_factures_groupe",
                datas.getGroupes());
    }

    private Map<String, Object> getParameters(HttpServletRequest request, String dtStart, String dtEnd,
            ReleveGroupeFactureDTO datas) {
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);

        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "RELEVE DES FACTURES DE GROUPE PERIODE DU " + periode);
        parameters.put("P_MONTANT_FACTURE", datas.getMontantFacture());
        parameters.put("P_MONTANT_REGLE", datas.getMontantRegle());
        parameters.put("P_MONTANT_RESTANT", datas.getMontantRestant());
        parameters.put("P_NB_FACTURES", datas.getNbFactures());
        parameters.put("P_NOTE_MONTANT", datas.getMontantRestant() != null && datas.getMontantRestant().signum() > 0
                ? "SAUF ERREUR DE NOTRE PART LE REGLEMENT DES FACTURES CI-DESSUS RELEVEES NE NOUS EST PAS ENCORE PARVENU. NOUS VOUS PRIONS DE BIEN VOULOIR NOUS LES REGLER A VOTRE CONVENANCE DANS LES DELAIS"
                : "");
        return parameters;
    }

    /** Sans date de debut a l'ecran, on remonte d'un an : c'est le comportement du releve des factures clients. */
    private static String defautDebut(String valeur) {
        return StringUtils.isEmpty(valeur) ? LocalDate.now().minusYears(1).toString() : valeur;
    }

    private static String defautFin(String valeur) {
        return StringUtils.isEmpty(valeur) ? LocalDate.now().toString() : valeur;
    }

    private static Integer entier(String valeur) {
        if (StringUtils.isEmpty(valeur)) {
            return 0;
        }
        try {
            return Integer.valueOf(valeur.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
