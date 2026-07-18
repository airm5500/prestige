<%@page import="dal.TEmplacement"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TOfficine"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="dal.dataManager"%>
<%@page import="dal.TUser"%>
<%@page import="bll.bllBase"%>
<%@page import="java.util.*"%>
<%@page import="toolkits.utils.date"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%--
    Impression Jasper du 'Check EMPLACEMENT' : statut du comptage par
    emplacement (Non fait / En cours / Termine). Modele : rp_check_emplacement.jrxml.
--%>
<%
    String lg_INVENTAIRE_ID = "";
    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
    }

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();

    String report_generate_file = key.GetNumberRandom() + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + "rp_check_emplacement.jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "check_emplacement_" + report_generate_file);

    Map parameters = new HashMap();
    parameters.put("P_REFERENCE", lg_INVENTAIRE_ID);
    parameters.put("P_H_CLT_INFOS", "CHECK EMPLACEMENT — STATUT DU COMPTAGE");

    String P_INSTITUTION_ADRESSE = "", P_FOOTER_RC = "";
    if ("1".equals(OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
        TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
        parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
            P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
        }
        if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
            P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
        }
        if (oTOfficine.getStrPHONE() != null) {
            P_INSTITUTION_ADRESSE += " Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE());
        }
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    } else {
        TEmplacement oEm = OTUser.getLgEMPLACEMENTID();
        parameters.put("P_H_INSTITUTION", oEm.getStrDESCRIPTION());
        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        if (oEm.getStrLOCALITE() != null) {
            P_INSTITUTION_ADRESSE += "Localité : " + oEm.getStrLOCALITE();
        }
        if (oEm.getStrPHONE() != null) {
            P_INSTITUTION_ADRESSE += " - Tel: " + conversion.PhoneNumberFormat("+225", oEm.getStrPHONE());
        }
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    }

    OreportManager.BuildReport(parameters, Ojconnexion);
    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "check_emplacement_" + report_generate_file);
%>
