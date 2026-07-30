<%--
    Releve de facturation FNE d'un tiers payant (factures certifiees / avoirs / solde net).
    Genere le PDF a partir du modele rp_releve_fne.jrxml (repertoire des modeles jdom).
--%>
<%@page import="java.text.SimpleDateFormat"%>
<%@page import="java.util.*"%>
<%@page import="dal.TOfficine"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.jconnexion"%>
<%@page import="bll.bllBase"%>
<%@page import="report.reportManager"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="toolkits.utils.date"%>
<%
    String tiersPayantId = request.getParameter("tiersPayantId");
    if (tiersPayantId == null || "".equals(tiersPayantId)) {
        out.print("Le tiers payant est obligatoire");
        return;
    }
    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
    Date dtStart;
    try {
        dtStart = sdf.parse(request.getParameter("dtStart"));
    } catch (Exception e) {
        dtStart = sdf.parse("2000-01-01");
    }
    Date dtEnd;
    try {
        dtEnd = sdf.parse(request.getParameter("dtEnd"));
    } catch (Exception e) {
        dtEnd = new Date();
    }
    Calendar cal = Calendar.getInstance();
    cal.setTime(dtEnd);
    cal.set(Calendar.HOUR_OF_DAY, 23);
    cal.set(Calendar.MINUTE, 59);
    cal.set(Calendar.SECOND, 59);
    dtEnd = cal.getTime();

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();
    TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(TOfficine.class, "1");
    TTiersPayant oTiersPayant = obllBase.getOdataManager().getEm().find(TTiersPayant.class, tiersPayantId);
    if (oTiersPayant == null) {
        out.print("Tiers payant introuvable");
        return;
    }

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    SimpleDateFormat shortFr = new SimpleDateFormat("dd/MM/yyyy");
    Map<String, Object> parameters = new HashMap();
    parameters.put("P_H_INSTITUTION", oTOfficine != null ? oTOfficine.getStrNOMCOMPLET() : "");
    parameters.put("P_TIERS_PAYANT_NAME", oTiersPayant.getStrFULLNAME());
    parameters.put("P_PERIODE", "Du " + shortFr.format(dtStart) + " au " + shortFr.format(dtEnd));
    parameters.put("P_LG_TIERS_PAYANT_ID", tiersPayantId);
    parameters.put("P_DT_START", dtStart);
    parameters.put("P_DT_END", dtEnd);

    String report_generate_file = "rp_releve_fne_" + key.GetNumberRandom() + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + "rp_releve_fne.jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + report_generate_file);
    OreportManager.BuildReport(parameters, Ojconnexion);
    Ojconnexion.CloseConnexion();

    response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + report_generate_file);
%>
