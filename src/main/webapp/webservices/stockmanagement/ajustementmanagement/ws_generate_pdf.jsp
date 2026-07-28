<%@page import="bll.common.Parameter"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TAjustement"%>
<%@page import="dal.TAjustement"%>
<%@page import="java.awt.print.PageFormat"%>
<%@page import="java.awt.print.Paper"%>
<%@page import="dal.TPreenregistrementCompteClient"%>
<%@page import="dal.TOfficine"%>
<%@page import="cust_barcode.barecodeManager"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="dal.TTypeReglement"%>
<%@page import="dal.TCashTransaction"%>
<%@page import="dal.TPreenregistrement"%>
<%@page import="dal.TPreenregistrementDetail"%>
<%@page import="bll.preenregistrement.Preenregistrement"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>

<%
    Translate OTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    TParameters OTParameters;

    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_AJUSTEMENT_ID = "%%", lg_EMPLACEMENT_ID = "";

    if (request.getParameter("lg_AJUSTEMENT_ID") != null) {
        lg_AJUSTEMENT_ID = request.getParameter("lg_AJUSTEMENT_ID");
        new logger().OCategory.info("lg_AJUSTEMENT_ID " + lg_AJUSTEMENT_ID);
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    new logger().OCategory.info("Utilisateur " + OTUser.getStrFIRSTNAME() + " Id " + OTUser.getLgUSERID());
    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    OdataManager.initEntityManager();

    privilege Oprivilege = new privilege(OdataManager, OTUser);
    if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
        lg_EMPLACEMENT_ID = "%%";
    } else {
        lg_EMPLACEMENT_ID = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    TAjustement oTAjustement = OdataManager.getEm().find(dal.TAjustement.class, lg_AJUSTEMENT_ID);
    String scr_report_file = "rp_fiche_ajustement_";

    String report_generate_file = key.GetNumberRandom();

    new logger().OCategory.info("scr_report_file " + scr_report_file);
    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "fiche_ajustement_" + report_generate_file);

    TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");

    new logger().OCategory.info(" **** ajustement id depuis generate pdf   ****  HHHHH" + oTAjustement.getLgAJUSTEMENTID() + " " + oTOfficine.getStrNOMCOMPLET());

    Paper paper = new Paper();
    PageFormat format = new PageFormat();

    // La zone figure dans le TITRE plutot que dans une colonne : le modele .jrxml n'a pas a
    // changer, l'intitule etant un parametre. Un ajustement anterieur a la gestion par zone
    // releve du rayon, comportement historique.
    String zoneAjustement = oTAjustement.getStrZONE() == null ? "RAYON" : oTAjustement.getStrZONE();
    String P_H_CLT_INFOS = "Fiche d'ajustement de stock - "
            + ("RESERVE".equalsIgnoreCase(zoneAjustement) ? "RESERVE" : "RAYON");
    String P_H_CC_P_H_RC = "", P_H_CI_P_H_RI = "";
    if ((oTOfficine.getStrCOMPTECONTRIBUABLE() != null && !"".equals(oTOfficine.getStrCOMPTECONTRIBUABLE())) && (oTOfficine.getStrREGISTRECOMMERCE() != null && !"".equals(oTOfficine.getStrREGISTRECOMMERCE()))) {
        P_H_CC_P_H_RC = oTOfficine.getStrCOMPTECONTRIBUABLE() + " / " + oTOfficine.getStrREGISTRECOMMERCE();
    } else if ((oTOfficine.getStrCOMPTECONTRIBUABLE() != null && !"".equals(oTOfficine.getStrCOMPTECONTRIBUABLE())) && (oTOfficine.getStrREGISTRECOMMERCE() == null || "".equals(oTOfficine.getStrREGISTRECOMMERCE()))) {
        P_H_CC_P_H_RC = oTOfficine.getStrCOMPTECONTRIBUABLE();
    } else if ((oTOfficine.getStrCOMPTECONTRIBUABLE() == null || "".equals(oTOfficine.getStrCOMPTECONTRIBUABLE())) && (oTOfficine.getStrREGISTREIMPOSITION() != null || !"".equals(oTOfficine.getStrREGISTREIMPOSITION()))) {
        P_H_CC_P_H_RC = oTOfficine.getStrREGISTRECOMMERCE();
    }
    if ((oTOfficine.getStrCENTREIMPOSITION() != null && !"".equals(oTOfficine.getStrCENTREIMPOSITION())) && (oTOfficine.getStrREGISTREIMPOSITION() != null && !"".equals(oTOfficine.getStrREGISTREIMPOSITION()))) {
        P_H_CI_P_H_RI = oTOfficine.getStrCENTREIMPOSITION() + " / " + oTOfficine.getStrREGISTRECOMMERCE();
    } else if ((oTOfficine.getStrCENTREIMPOSITION() != null && !"".equals(oTOfficine.getStrCENTREIMPOSITION())) && (oTOfficine.getStrREGISTREIMPOSITION() == null || "".equals(oTOfficine.getStrREGISTREIMPOSITION()))) {
        P_H_CI_P_H_RI = oTOfficine.getStrCENTREIMPOSITION();
    } else if ((oTOfficine.getStrCENTREIMPOSITION() == null || "".equals(oTOfficine.getStrCENTREIMPOSITION())) && (oTOfficine.getStrREGISTREIMPOSITION() != null || !"".equals(oTOfficine.getStrREGISTREIMPOSITION()))) {
        P_H_CI_P_H_RI = oTOfficine.getStrREGISTREIMPOSITION();
    }
    new logger().OCategory.info(" **** P_H_CLT_INFOS   ****" + P_H_CLT_INFOS);

    barecodeManager obarecodeManager = new barecodeManager();
    String fileBarecode = obarecodeManager.buildLineBarecode(oTAjustement.getLgAJUSTEMENTID());
    Map parameters = new HashMap();
    if (!"".equals(P_H_CI_P_H_RI)) {
        parameters.put("P_H_CI", "CI:" + P_H_CI_P_H_RI);
    } else {
        parameters.put("P_H_CI", " ");
    }
    if (!"".equals(P_H_CC_P_H_RC)) {
        parameters.put("P_H_CC", "CC:" + P_H_CC_P_H_RC);
    } else {
        parameters.put("P_H_CC", " ");
    }
    parameters.put("P_H_LOGO", jdom.scr_report_file_logo);
    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
    parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC", "  ");
    parameters.put("P_REFERENCE", oTAjustement.getLgAJUSTEMENTID());
    parameters.put("P_H_EMPLACEMENT", lg_EMPLACEMENT_ID);
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS.toUpperCase());
    String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                }
            }
            parameters.put("P_H_PHONE", finalphonestring);
       
     OreportManager.BuildReport(parameters, Ojconnexion);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "fiche_ajustement_" + report_generate_file);

%>


