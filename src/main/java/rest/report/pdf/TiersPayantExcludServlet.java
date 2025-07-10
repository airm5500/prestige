/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import dal.TOfficine;
import dal.TUser;
import dal.enumeration.TypeReglementCarnet;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.CaisseService;
import rest.service.CarnetAsDepotService;
import rest.service.RetourCarnetService;
import rest.service.TiersPayantExclusService;
import rest.service.dto.DepotProduitVendusDTO;
import rest.service.dto.ExtraitCompteClientDTO;
import rest.service.dto.RetourCarnetDTO;
import toolkits.utils.jdom;
import util.Constant;

/**
 *
 * @author koben
 */
public class TiersPayantExcludServlet extends HttpServlet {

    @EJB
    private CaisseService caisseService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private TiersPayantExclusService tiersPayantExclusService;
    @EJB
    private CarnetAsDepotService carnetAsDepotService;
    @EJB
    private RetourCarnetService retourCarnetService;

    private enum Action {
        VENTE, REGLEMENTS, RETOUR, PRODUITS, RETOUR_CARNET_DEPOT, REGLEMENTS_CARNET_DEPOT
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String tiersPayantId = request.getParameter("tiersPayantId");
        String query = request.getParameter("query");
        String typeReglementCarnet = request.getParameter("typeReglementCarnet");
        TypeReglementCarnet typeReglementCarnetEnum = null;
        if (StringUtils.isNotEmpty(typeReglementCarnet)) {
            typeReglementCarnetEnum = TypeReglementCarnet.valueOf(typeReglementCarnet);
        }
        String file = "";
        long period = ChronoUnit.MONTHS.between(LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        switch (Action.valueOf(action)) {
        case REGLEMENTS: {
            if (period == 0) {
                file = reglements(tiersPayantId, typeReglementCarnetEnum, dtStart, dtEnd, OTUser);
            } else {
                file = extraitCompteMonthly(tiersPayantId, typeReglementCarnetEnum, dtStart, dtEnd, OTUser);
            }
        }

            break;
        case VENTE:
            if (period == 0) {
                file = fetchVente(tiersPayantId, dtStart, dtEnd, OTUser);
            } else {
                file = extraitCompteMonthly(tiersPayantId, null, dtStart, dtEnd, OTUser);
            }
            break;

        case RETOUR:
            if (period == 0) {
                file = retourCarnet(tiersPayantId, query, dtStart, dtEnd, OTUser);
            } else {
                file = retourCarnetMonthly(tiersPayantId, query, dtStart, dtEnd, OTUser);
            }
            break;
        case PRODUITS:
            file = produitVenduDepot(tiersPayantId, dtStart, dtEnd, OTUser, null);
            break;
        case RETOUR_CARNET_DEPOT:
            file = retourCarnetDepot(tiersPayantId, query, dtStart, dtEnd, OTUser);
            break;
        case REGLEMENTS_CARNET_DEPOT: {
            if (period == 0) {
                file = reglementCarnetDepot(tiersPayantId, typeReglementCarnetEnum, dtStart, dtEnd, OTUser);
            } else {
                file = extraitCarnetDepotCompteMonthly(tiersPayantId, typeReglementCarnetEnum, dtStart, dtEnd, OTUser);
            }
        }
            break;
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

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    public String fetchVente(String tiersPayantId, String dtStart, String dtEnd, TUser tu) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_one";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet";
        } else {
            tiersPayant = tiersPayantExclusService.getTiersPayantName(tiersPayantId);
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<ExtraitCompteClientDTO> datas = tiersPayantExclusService.extraitcompte(tiersPayantId, null,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_vente_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_vente_" + report_generate_file;
    }

    public String reglements(String tiersPayantId, TypeReglementCarnet typeReglementCarnet, String dtStart,
            String dtEnd, TUser tu) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_one";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet";
        } else {
            tiersPayant = tiersPayantExclusService.getTiersPayantName(tiersPayantId) + " ";
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<ExtraitCompteClientDTO> datas = tiersPayantExclusService.extraitcompte(tiersPayantId, typeReglementCarnet,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_" + report_generate_file;
    }

    public String retourCarnet(String tiersPayantId, String query, String dtStart, String dtEnd, TUser tu)
            throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_one";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet";
        } else {
            tiersPayant = tiersPayantExclusService.getTiersPayantName(tiersPayantId) + " ";
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<ExtraitCompteClientDTO> datas = carnetAsDepotService.extraitcompteAvecRetour(tiersPayantId,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query);
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_" + report_generate_file;
    }

    public String retourCarnetMonthly(String tiersPayantId, String query, String dtStart, String dtEnd, TUser tu)
            throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_monthly";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet_monthy";
        } else {
            tiersPayant = tiersPayantExclusService.getTiersPayantName(tiersPayantId) + " ";
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<ExtraitCompteClientDTO> datas = carnetAsDepotService.extraitcompteAvecRetour(tiersPayantId,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query);
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_" + report_generate_file;
    }

    public String extraitCompteMonthly(String tiersPayantId, TypeReglementCarnet typeReglementCarnet, String dtStart,
            String dtEnd, TUser tu) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_monthly";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet_monthy";
        } else {
            tiersPayant = tiersPayantExclusService.getTiersPayantName(tiersPayantId);
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";

        List<ExtraitCompteClientDTO> datas = tiersPayantExclusService.extraitcompte(tiersPayantId, typeReglementCarnet,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_vente_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_vente_" + report_generate_file;
    }

    public String produitVenduDepot(String tiersPayantId, String dtStart, String dtEnd, TUser tu, String query)
            throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "PRODUITS VENDUTS AU DEPOT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_produits_vendus_au_depot";
        if (StringUtils.isEmpty(tiersPayantId)) {

        } else {
            tiersPayant = tiersPayantExclusService.getTiersPayantName(tiersPayantId) + " ";
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<DepotProduitVendusDTO> datas = carnetAsDepotService.produitVenduParDepot(tiersPayantId,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, 0, 0, true);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_produits_vendus_au_depot_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_produits_vendus_au_depot_" + report_generate_file;
    }

    public String retourCarnetDepot(String tiersPayantId, String query, String dtStart, String dtEnd, TUser tu)
            throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "RETOUR DEPOT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_retour_au_depot_";

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("rp_retour_au_depot_subreport", jdom.scr_report_file);
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<RetourCarnetDTO> datas = retourCarnetService.fetchRetourByTierspayantIdAndPeriode(tiersPayantId, query,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_retour_au_depot_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_retour_au_depot_" + report_generate_file;
    }

    public String reglementCarnetDepot(String tiersPayantId, TypeReglementCarnet typeReglementCarnet, String dtStart,
            String dtEnd, TUser tu) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_one";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet";
        } else {
            tiersPayant = carnetAsDepotService.getTiersPayantName(tiersPayantId) + " ";
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";
        List<ExtraitCompteClientDTO> datas = carnetAsDepotService.extraitcompte(tiersPayantId, typeReglementCarnet,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_" + report_generate_file;
    }

    public String extraitCarnetDepotCompteMonthly(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            String dtStart, String dtEnd, TUser tu) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        TOfficine oTOfficine = caisseService.findOfficine();
        String P_H_CLT_INFOS = "EXTRAIT COMPTE CLIENT ";
        String tiersPayant = " ";
        String scr_report_file = "rp_extrait_compte_carnet_only_monthly";
        if (StringUtils.isEmpty(tiersPayantId)) {
            scr_report_file = "rp_extrait_compte_carnet_monthy";
        } else {
            tiersPayant = carnetAsDepotService.getTiersPayantName(tiersPayantId);
        }

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = " PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS + tiersPayant + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_dd_MM_HH_mm_ss"))
                + ".pdf";

        List<ExtraitCompteClientDTO> datas = carnetAsDepotService.extraitcompte(tiersPayantId, typeReglementCarnet,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getTierspayantName));
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "extrait_compte_vente_" + report_generate_file, datas);
        return "/data/reports/pdf/extrait_compte_vente_" + report_generate_file;
    }

}
