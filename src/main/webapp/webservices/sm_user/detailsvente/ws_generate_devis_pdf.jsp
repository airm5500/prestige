<%@page import="bll.preenregistrement.DevisManagement"%>
<%@page import="dal.TCompteClient"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TCompteClientTiersPayant"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
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

<%     String lg_PREENREGISTREMENT_ID = "";
    Translate OTranslate = new Translate();
    /*dataManager OdataManager = new dataManager();
    TParameters OTParameters;*/
    bllBase ObllBase = new bllBase();
    TUser OTUser = null;
    TCompteClient OTCompteClient = null;
%>


<!-- fin logic de gestion des page -->

<%
    if (request.getParameter("lg_PREENREGISTREMENT_ID") != null) {
        lg_PREENREGISTREMENT_ID = request.getParameter("lg_PREENREGISTREMENT_ID");
        new logger().OCategory.info("lg_PREENREGISTREMENT_ID " + lg_PREENREGISTREMENT_ID);
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();
    String scr_report_file = "rp_devis";
    String report_generate_file = key.GetNumberRandom();

    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "devis_" + report_generate_file);

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();
    /* TCompteClientTiersPayant OTCompteClientTiersPayant = new TCompteClientTiersPayant();
    List<TPreenregistrementCompteClientTiersPayent> lstT = null;
    Preenregistrement OPreenregistrement = new Preenregistrement(obllBase.getOdataManager(), OTUser);
    DevisManagement ODevisManagement = new DevisManagement(obllBase.getOdataManager(), obllBase.getOTUser());*/

    TPreenregistrement oTPreenregistrement = obllBase.getOdataManager().getEm().find(dal.TPreenregistrement.class, lg_PREENREGISTREMENT_ID);
    TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");

    new logger().OCategory.info(" ****   lg_preenregistrement_id depuis generate pdf   ****  HHHHH" + oTPreenregistrement.getLgPREENREGISTREMENTID() + " " + oTOfficine.getStrNOMCOMPLET());

    String P_H_TITTLE = "";
    String P_AMOUNT_DEVIS = "";
    String P_H_CLT_INFOS = "";
    String str_tp_infos = "", P_CLIENT = "";
    int total_devis = 0;
    P_CLIENT = (oTPreenregistrement.getStrNUMEROSECURITESOCIAL() != null && !oTPreenregistrement.getStrNUMEROSECURITESOCIAL().equalsIgnoreCase("") ? oTPreenregistrement.getStrNUMEROSECURITESOCIAL() + " | " : "") + oTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " " + oTPreenregistrement.getStrLASTNAMECUSTOMER();
    P_H_CLT_INFOS = "Proforma N� " + oTPreenregistrement.getStrREF();
    total_devis = oTPreenregistrement.getIntPRICE() - oTPreenregistrement.getIntPRICEREMISE();
    

    //  double dbl_amount = ODevisManagement.GetDevis_TvaAmount(oTPreenregistrement);
    //  new logger().OCategory.info(" **** dbl_amount   ****" + dbl_amount);
    //P_AMOUNT_DEVIS = "Le Montant de la Tva pour cette Proforma est de  " + dbl_amount + " F CFA";
    P_AMOUNT_DEVIS = "Le Montant TTC pour cette Proforma est de  " + conversion.AmountFormat(total_devis, '.') + " F CFA";

    barecodeManager obarecodeManager = new barecodeManager();
    String fileBarecode = obarecodeManager.buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
    Map parameters = new HashMap();

    new logger().OCategory.info(" *** num devis   *** " + oTPreenregistrement.getLgPREENREGISTREMENTID());

    parameters.put("str_REF", oTPreenregistrement.getStrREF());
    parameters.put("P_H_TITTLE", P_H_TITTLE);
    parameters.put("P_H_LOGO", jdom.scr_report_file_logo);
    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();

    String P_H_LOGO = jdom.scr_report_file_logo;

    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_CLIENT", P_CLIENT);

    parameters.put("P_H_CC_RC", ((oTOfficine.getStrCOMPTECONTRIBUABLE() != null && !oTOfficine.getStrCOMPTECONTRIBUABLE().equalsIgnoreCase("")) ? "CC:" + oTOfficine.getStrCOMPTECONTRIBUABLE() : "") + ((oTOfficine.getStrREGISTRECOMMERCE() != null && !oTOfficine.getStrREGISTRECOMMERCE().equalsIgnoreCase("")) ? " / RC: " + oTOfficine.getStrREGISTRECOMMERCE() : ""));

    parameters.put("P_H_CI_RI", ((oTOfficine.getStrCENTREIMPOSITION() != null && !oTOfficine.getStrCENTREIMPOSITION().equalsIgnoreCase("")) ? "CI:" + oTOfficine.getStrCENTREIMPOSITION() : "") + ((oTOfficine.getStrREGISTREIMPOSITION() != null && !oTOfficine.getStrREGISTREIMPOSITION().equalsIgnoreCase("")) ? " / RI: " + oTOfficine.getStrREGISTREIMPOSITION() : ""));
    parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_H_PHONE", (oTOfficine.getStrPHONE() != null ? "Tel: " + util.DateConverter.phoneNumberFormat("+225", oTOfficine.getStrPHONE()) : ""));

    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
    parameters.put("P_H_LOGO", P_H_LOGO);
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

    String P_FOOTER_RC = "";

    if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
        P_FOOTER_RC += "RC N� " + oTOfficine.getStrREGISTRECOMMERCE();
    }

    if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
        P_FOOTER_RC += " - CC N� " + oTOfficine.getStrCOMPTECONTRIBUABLE();
    }
    if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
        P_FOOTER_RC += " - R�gime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
    }
    if (oTOfficine.getStrCENTREIMPOSITION() != null) {
        P_FOOTER_RC += " - Centre des Imp�ts: " + oTOfficine.getStrCENTREIMPOSITION();
    }

    if (oTOfficine.getStrPHONE() != null) {
        P_INSTITUTION_ADRESSE += " - Tel: " + util.DateConverter.phoneNumberFormat("+225", oTOfficine.getStrPHONE());
    }
    if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
        P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
    }
    if (oTOfficine.getStrNUMCOMPTABLE() != null) {
        P_INSTITUTION_ADRESSE += " - CPT N�: " + oTOfficine.getStrNUMCOMPTABLE();
    }

    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_FOOTER_RC", P_FOOTER_RC);

   
    parameters.put("P_dt_CREATED", obllBase.getKey().DateToString(new Date(), obllBase.getKey().formatterMysql));
    parameters.put("P_BARE_CODE", jdom.barecode_file + "" + fileBarecode + ".png");
     parameters.put("P_REFERENCE", oTPreenregistrement.getLgPREENREGISTREMENTID());
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
    parameters.put("P_TIERSPAYANT", str_tp_infos);

    //parameters.put("P_TOTAL_DEVIS", conversion.GetNumberTowords(Double.parseDouble(total_devis + "")) + " -- (" + conversion.AmountFormat(total_devis) +")"); // affiche la part du tiers payant
    parameters.put("P_TOTAL_DEVIS", conversion.GetNumberTowords(Double.parseDouble(total_devis + "")) + " -- (" + conversion.AmountFormat(total_devis) + ")");
    parameters.put("P_AMOUNT_DEVIS", P_AMOUNT_DEVIS.toUpperCase());
    parameters.put("P_REMISE", oTPreenregistrement.getIntPRICEREMISE());
    /*new logger().OCategory.info("P_AMOUNT_DEVIS" + P_AMOUNT_DEVIS);
    new logger().OCategory.info("P_REFERENCE" + lg_PREENREGISTREMENT_ID);
    new logger().OCategory.info("getStrADRESSSEPOSTALE" + oTOfficine.getStrADRESSSEPOSTALE());*/
    OreportManager.BuildReport(parameters, Ojconnexion);

    ObllBase.setKey(new date());
    ObllBase.setOTranslate(OTranslate);
    ObllBase.setOTUser(OTUser);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "devis_" + report_generate_file);

%>


