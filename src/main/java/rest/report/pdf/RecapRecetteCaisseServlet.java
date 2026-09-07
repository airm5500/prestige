
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
import rest.service.StatCaisseRecetteService;
import rest.service.StatCaisseRecetteService.Granularite;
import rest.service.dto.StatCaisseRecetteDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@WebServlet(name = "RecapRecetteCaisseServlet", urlPatterns = { "/RecapRecetteCaisseServlet" })
public class RecapRecetteCaisseServlet extends HttpServlet {

    @EJB
    private StatCaisseRecetteService statCaisseRecetteService;
    @EJB
    private ReportUtil reportUtil;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        /*
         * Point 16 : l'edition est construite en code et servie directement.
         *
         * Elle passait par l'etat jasper « rp_recap_caisse_recette », introuvable dans les sources comme sur le serveur
         * : la redirection menait a un fichier jamais ecrit, donc a un 404. Le constructeur en code corrige cela et
         * permet de poser les lignes mobile money au pied de chaque journee.
         */
        response.setContentType("application/pdf");
        byte[] pdf = buildReport(request);
        response.setHeader("Content-Disposition", "inline; filename=\"recap_caisse_recette.pdf\"");
        response.setContentLength(pdf.length);
        response.getOutputStream().write(pdf);
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

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private byte[] buildReport(HttpServletRequest request) {
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);

        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String typeRglementId = request.getParameter("typeRglementId");
        Granularite granularite = Granularite.depuis(request.getParameter("granularite"),
                Boolean.parseBoolean(request.getParameter("groupByYear")));
        LocalDate dtSt = LocalDate.parse(dtStart);
        LocalDate dtd = LocalDate.parse(dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtSt.isEqual(dtd)) {
            periode += " AU " + dtd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        List<StatCaisseRecetteDTO> datas = this.statCaisseRecetteService.fetchStatCaisseRecettes(dtStart, dtEnd,
                typeRglementId, granularite, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return RecapCaisseRecettePdf.construire(datas, String.valueOf(parameters.getOrDefault("P_H_INSTITUTION", "")),
                "DU " + periode, String.valueOf(parameters.getOrDefault("P_PRINTED_BY", "")));

    }
}
