/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.SumCaisseDTO;
import commonTasks.dto.VisualisationCaisseDTO;
import dal.TOfficine;
import dal.TPrivilege;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.CaisseService;
import rest.service.ListCaisseService;

import toolkits.utils.jdom;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class BalancePdfServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    @EJB
    private Balance balance;
    @EJB
    private CaisseService caisseService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private ListCaisseService listCaisseService;

    private enum Action {
        BALANCE, GESTION_CAISSE, TABLEAU, TVA, REPORT, LISTECAISSE, SUIVIMVT, RECAP, TVA_JOUR, STAT_FAMILLE_ARTICLE,
        PERIMES, STAT_RAYONS_ARTICLE, STAT_PROVIDER_ARTICLE, UNITES_AVOIRS, BALANCE_PARA, SAISIE_PERIMES,
        STAT_FAMILLE_ARTICLE_VETO, SUIVI_REMISE, BALANCE_CARNET, TABLEAU_CARNET, LISTECAISSE_V2
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/pdf");
        HttpSession session = request.getSession();
        TUser oUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
        String action = request.getParameter("mode");
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        boolean checkug = false;
        boolean ration;
        boolean monthly;
        try {
            checkug = Boolean.parseBoolean(request.getParameter("checkug"));
        } catch (Exception e) {
        }
        Params params = new Params();
        params.setOperateur(oUser);
        String codeFamile;
        String codeRayon;
        String codeGrossiste;
        String query;
        String file = "";
        if (dtEnd != null && !"".equals(dtEnd)) {
            params.setDtEnd(dtEnd);
        }
        if (dtStart != null && !"".equals(dtStart)) {
            params.setDtStart(dtStart);
        }
        params.setCheckug(checkug);
        switch (Action.valueOf(action)) {
        case BALANCE_CARNET:
            file = balance.generatepdf(params, false, true);
            break;
        case BALANCE:
            file = balance.generatepdf(params, true, false);
            break;
        case BALANCE_PARA:
            file = balance.tbalancePara(params);
            break;
        case GESTION_CAISSE:
            String userId = request.getParameter("userId");
            if (!"".equals(userId)) {
                params.setRef(userId);
            }
            List<TPrivilege> lstTPrivilege = (List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE);
            file = balance.gestionCaissepdf(params, lstTPrivilege);
            break;
        case TABLEAU:
            ration = Boolean.parseBoolean(request.getParameter("ration"));
            monthly = Boolean.parseBoolean(request.getParameter("monthly"));
            file = balance.tableauBordPharmation(params, ration, monthly, false);
            break;
        case TABLEAU_CARNET:
            ration = Boolean.parseBoolean(request.getParameter("ration"));
            monthly = Boolean.parseBoolean(request.getParameter("monthly"));
            file = balance.tableauBordPharmation(params, ration, monthly, true);
            break;

        case TVA:
            file = balance.tvapdf(params.ref(request.getParameter("typeVente")));
            break;

        case TVA_JOUR:
            file = balance.tvaJourpdf(params.ref(request.getParameter("typeVente")));
            break;
        case REPORT:
            file = balance.reportGestion(params);
            break;
        case LISTECAISSE:
        case LISTECAISSE_V2:
            String lgUSERID = request.getParameter("user"), reglement = request.getParameter("reglement");
            String startDate = request.getParameter("startDate"), endDate = request.getParameter("endDate");
            String startH = request.getParameter("startH"), endH = request.getParameter("endH");
            CaisseParamsDTO caisseParams = new CaisseParamsDTO();
            caisseParams.setEmplacementId(oUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (!StringUtils.isEmpty(endDate)) {
                caisseParams.setEnd(LocalDate.parse(endDate));
            }
            if (!StringUtils.isEmpty(startDate)) {
                caisseParams.setStartDate(LocalDate.parse(startDate));
            }
            if (!StringUtils.isEmpty(startH)) {
                caisseParams.setStartHour(LocalTime.parse(startH));
            }
            if (!StringUtils.isEmpty(endH)) {
                caisseParams.setStartEnd(LocalTime.parse(endH));
            }
            if (!StringUtils.isEmpty(reglement)) {

                caisseParams.setTypeReglementId(reglement);
            }
            if (!StringUtils.isEmpty(lgUSERID)) {
                caisseParams.setUtilisateurId(lgUSERID);
            }
            caisseParams.setFindClient(true);
            if (action.equalsIgnoreCase(Action.LISTECAISSE_V2.name())) {
                file = listeCaisseVersion2(caisseParams, oUser);
            } else {
                file = listeCaisse(caisseParams, oUser);
            }

            break;

        case SUIVIMVT:
            String dtSt = request.getParameter("dtStart"), dtEn = request.getParameter("dtEnd");
            String produitId = request.getParameter("produitId");
            file = balance.suivMvtArticle(LocalDate.parse(dtSt), LocalDate.parse(dtEn), produitId,
                    oUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), oUser);
            break;
        case RECAP:
            params.setDescription(request.getParameter("query"));
            file = balance.recap(params);
            break;
        case STAT_FAMILLE_ARTICLE:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");
            query = request.getParameter("query");
            file = balance.familleArticle(dtStart, dtEnd, codeFamile, query, oUser, codeRayon, codeGrossiste);
            break;
        case STAT_FAMILLE_ARTICLE_VETO:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");
            query = request.getParameter("query");
            file = balance.familleArticleveto(dtStart, dtEnd, codeFamile, query, oUser, codeRayon, codeGrossiste);
            break;

        case PERIMES:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");
            query = request.getParameter("query");
            int nbre = 0;
            try {
                nbre = Integer.parseInt(request.getParameter("nbre"));
            } catch (Exception e) {
            }

            file = balance.produitPerimes(query, nbre, dtStart, dtEnd, oUser, codeFamile, codeRayon, codeGrossiste);
            break;
        case SAISIE_PERIMES:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");
            query = request.getParameter("query");
            Integer groupby = null;
            try {
                groupby = Integer.valueOf(request.getParameter("groupby"));
            } catch (Exception e) {
            }
            file = balance.saisiePerimes(query, dtStart, dtEnd, oUser, codeFamile, codeRayon, codeGrossiste, groupby);
            break;
        case STAT_PROVIDER_ARTICLE:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");
            query = request.getParameter("query");
            file = balance.statistiqueParGrossistes(dtStart, dtEnd, codeFamile, query, oUser, codeRayon, codeGrossiste);
            break;
        case STAT_RAYONS_ARTICLE:
            codeFamile = request.getParameter("codeFamile");
            codeRayon = request.getParameter("codeRayon");
            codeGrossiste = request.getParameter("codeGrossiste");
            query = request.getParameter("query");
            file = balance.statistiqueParRayons(dtStart, dtEnd, codeFamile, query, oUser, codeRayon, codeGrossiste);
            break;
        case UNITES_AVOIRS:

            String hEnd = request.getParameter("hEnd");
            String hStart = request.getParameter("hStart");
            SalesStatsParams body = buildSalesStatsParams(request, session, oUser);
            body.setOnlyAvoir(true);
            body.setSansBon(false);

            try {
                body.sethEnd(LocalTime.parse(hEnd));
            } catch (Exception e) {
            }
            try {
                body.sethStart(LocalTime.parse(hStart));
            } catch (Exception e) {
            }

            file = balance.listeVentes(body);
            break;
        case SUIVI_REMISE:
            String tiersPayantId = request.getParameter("tiersPayantId");
            SalesStatsParams bodySuivi = buildSalesStatsParams(request, session, oUser);
            bodySuivi.setTiersPayantId(tiersPayantId);
            bodySuivi.setDiscountStat(true);
            bodySuivi.sethStart(LocalTime.of(0, 0, 0));
            bodySuivi.sethEnd(LocalTime.of(23, 59));
            file = balance.suiviRemise(bodySuivi);
            break;

        default:
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
    }

    public String listeCaisse(CaisseParamsDTO caisseParams, TUser tu) throws IOException {

        String scrreportfile = "rp_listecaisses1";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        final Comparator<VisualisationCaisseDTO> comparatorCaisse = Comparator
                .comparing(VisualisationCaisseDTO::getDateOperation);
        SumCaisseDTO caisse = caisseService.cumul(caisseParams, true);
        List<VisualisationCaisseDTO> datas = new ArrayList<>();

        Map<String, List<VisualisationCaisseDTO>> map = caisse.getCaisses().stream()
                .collect(Collectors.groupingBy(VisualisationCaisseDTO::getOperateurId));
        map.forEach((k, v) -> {
            v.sort(comparatorCaisse);
            VisualisationCaisseDTO dto = new VisualisationCaisseDTO();
            VisualisationCaisseDTO index0 = v.get(0);
            dto.setDateOperation(index0.getDateOperation());
            dto.setOperateur(index0.getOperateur());
            dto.setOperateurId(k);
            dto.setDatas(v);
            datas.add(dto);
        });
        datas.sort(comparatorCaisse);
        LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
        String pPeriode = "PERIODE DU " + debut.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
        pPeriode += " AU " + fin.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        parameters.put("P_H_CLT_INFOS", "LISTE DES CAISSES  " + pPeriode);
        String reportGenerateFile = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        parameters.put("totaux", caisse.getSummary());
        parameters.put("sub_reportUrl", jdom.scr_report_file);
        reportUtil.buildReport(parameters, scrreportfile, jdom.scr_report_file,
                jdom.scr_report_pdf + "listecaisses_" + reportGenerateFile, datas);
        return "/data/reports/pdf/listecaisses_" + reportGenerateFile;
    }

    private SalesStatsParams buildSalesStatsParams(HttpServletRequest request, HttpSession session, TUser user) {
        String dtStart = request.getParameter("dtStart");
        String dtEnd = request.getParameter("dtEnd");
        String typeVenteId = request.getParameter("typeVenteId");
        String query = request.getParameter("query");
        SalesStatsParams body = new SalesStatsParams();
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = DateConverter.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = DateConverter.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        boolean canCancel = DateConverter.hasAuthorityByName(lstTPrivilege, Constant.P_BT_ANNULER_VENTE);
        boolean modification = DateConverter.hasAuthorityByName(lstTPrivilege, Constant.P_BT_MODIFICATION_DE_VENTE);
        body.setCanCancel(canCancel);
        body.setQuery(query);
        body.setTypeVenteId(typeVenteId);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(true);
        body.setUserId(user);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setModification(modification);

        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }
        return body;
    }

    public String listeCaisseVersion2(CaisseParamsDTO caisseParams, TUser tu) throws IOException {
        caisseParams.setAll(true);

        String scrreportfile = "rp_caisse_list";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        final Comparator<rest.service.v2.dto.VisualisationCaisseDTO> comparatorCaisse = Comparator
                .comparing(rest.service.v2.dto.VisualisationCaisseDTO::getDateOperation);

        List<rest.service.v2.dto.VisualisationCaisseDTO> datas = new ArrayList<>();

        Map<String, List<rest.service.v2.dto.VisualisationCaisseDTO>> map = this.listCaisseService
                .fetchAll(caisseParams).stream()
                .collect(Collectors.groupingBy(rest.service.v2.dto.VisualisationCaisseDTO::getOperateurId));
        map.forEach((k, v) -> {
            v.sort(comparatorCaisse);
            rest.service.v2.dto.VisualisationCaisseDTO dto = new rest.service.v2.dto.VisualisationCaisseDTO();
            rest.service.v2.dto.VisualisationCaisseDTO index0 = v.get(0);
            dto.setDateOperation(index0.getDateOperation());
            dto.setOperateur(index0.getOperateur());
            dto.setOperateurId(k);
            dto.setDatas(v);
            datas.add(dto);
        });
        datas.sort(comparatorCaisse);
        LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
        String periode = "PERIODE DU " + debut.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
        periode += " AU " + fin.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        parameters.put("P_H_CLT_INFOS", "LISTE DES CAISSES  " + periode);
        String reportgeneratefile = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        parameters.put("totaux", this.listCaisseService.fetchSummary(caisseParams));
        parameters.put("sub_reportUrl", jdom.scr_report_file);
        reportUtil.buildReport(parameters, scrreportfile, jdom.scr_report_file,
                jdom.scr_report_pdf + "listecaisses_" + reportgeneratefile, datas);
        return "/data/reports/pdf/listecaisses_" + reportgeneratefile;
    }
}
