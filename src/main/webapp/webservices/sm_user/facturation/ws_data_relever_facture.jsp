<%@page import="util.Constant"%>
<%@page import="org.apache.commons.lang3.StringUtils"%>
<%@page import="org.json.JSONObject"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>
<%@page import="bll.facture.factureManagement"%>
<%@page import="bll.entity.EntityData"%>

<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TFacture"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.commandeManagement.orderManagement"%>
<%@page import="java.awt.print.PageFormat"%>
<%@page import="java.awt.print.Paper"%>
<%@page import="dal.TPreenregistrementCompteClient"%>
<%@page import="dal.TOfficine"%>
<%@page import="cust_barcode.barecodeManager"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>

<%
    Translate OTranslate = new Translate();
    dataManager OdataManager = new dataManager();

    TParameters OTParameters;
    bllBase ObllBase = new bllBase();
    factureManagement facManagement = null;
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_FACTURE_ID = "%%", search = "", lgTP = "", str_NAME_FILE = "", lg_customer_id = "%%", search_value = "%%";
    String dt_debut = date.formatterMysqlShort.format(date.getPreviousMonth(0));
    String dt_fin = date.formatterMysqlShort.format(new Date());
    String scr_report_file = "rp_relever_facture_all";
    double impayes = -1.0;
    boolean all = StringUtils.isEmpty(request.getParameter("impayes"));
    boolean paid = !all && request.getParameter("impayes").equals("payes");

    if (paid) {
        impayes = 0.0;
        scr_report_file = "rp_relever_facture_payes";
    } else {
        impayes = 0.0;
    }

    String codeFacture = "%%", lg_GROUPE_ID = "";
    if (request.getParameter("lg_GROUPE_ID") != null && !"".equals(request.getParameter("lg_GROUPE_ID"))) {
        lg_GROUPE_ID = request.getParameter("lg_GROUPE_ID");
    }
    if (request.getParameter("CODEGROUPE") != null && !"".equals(request.getParameter("CODEGROUPE"))) {
        codeFacture = request.getParameter("CODEGROUPE");
    }
    if (request.getParameter("dt_fin") != null && !"".equals(request.getParameter("dt_fin"))) {
        dt_fin = request.getParameter("dt_fin");

    }
    if (request.getParameter("dt_debut") != null && !"".equals(request.getParameter("dt_debut"))) {
        dt_debut = request.getParameter("dt_debut");

    }
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value") + "%";
        search = request.getParameter("search_value");

    }

    if (request.getParameter("lg_FACTURE_ID") != null && !"".equals(request.getParameter("lg_FACTURE_ID"))) {
        lg_FACTURE_ID = request.getParameter("lg_FACTURE_ID");

    }

    if (request.getParameter("lg_customer_id") != null && !"".equals(request.getParameter("lg_customer_id"))) {
        lg_customer_id = request.getParameter("lg_customer_id");
        lgTP = lg_customer_id;
    }
    OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();
    GroupeTierspayantController cn = new GroupeTierspayantController(obllBase.getOdataManager().getEmf());
    TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
    TTiersPayant OTiersPayant = obllBase.getOdataManager().getEm().find(TTiersPayant.class, lg_customer_id);
    JSONObject mtn = cn.getReleveFacture(dt_debut, dt_fin, search, lgTP, paid, all);

    String P_TOTAL_GENERAL = "";

    if (OTiersPayant != null) {
        P_TOTAL_GENERAL = "SAUF ERREUR DE NOTRE PART LE REGLEMENT DE VOS FACTURES CI-DESSUS RELEVES NE NOUS EST PAS ENCORE PARVENU.\n NOUS VOUS PRIONS DE BIEN VOULOIR NOUS LES REGLER A VOTRE CONVENANCE DANS LES DELAIS";
        scr_report_file = "rp_relever_facture";

        if (paid) {
            impayes = 0.0;
            scr_report_file = "rp_relever_facture_tp_payes";
        } else {
            impayes = 0.0;
        }

    }

    String report_generate_file = key.GetNumberRandom();

    new logger().OCategory.info("scr_report_file " + scr_report_file);
    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_relever_facture" + report_generate_file);

    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();

    String P_H_LOGO = jdom.scr_report_file_logo;

    Map parameters = new HashMap();
    parameters.put("P_H_LOGO", P_H_LOGO);
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_H_CLT_INFOS", "RELEVE DES FACTURES CLIENTS EN COMPTE \n PERIODE DU " + date.formatterShort.format(java.sql.Date.valueOf(dt_debut)) + " AU " + date.formatterShort.format(java.sql.Date.valueOf(dt_fin)));

    parameters.put("P_LG_TIERS_PAYANT_ID", lg_customer_id);
    parameters.put("P_SEARCH", search_value);
    parameters.put("P_CODE_FACTURE", codeFacture);
    parameters.put("P_IMPAYE", impayes);
    parameters.put("P_DATE_START", dt_debut);
    parameters.put("P_DATE_END", dt_fin + " 23:59:59");

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
    String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
        for (String va  : phone) {
            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
        }
    }

    parameters.put("P_H_PHONE", finalphonestring);
    String P_TOTALMONTANTPAYE = "0", P_MONTANTRESTE = "0", P_TOTALMONTANTFAC = "0";
    if (mtn.length() > 0) {
        Double m = Double.valueOf(mtn.get("dblMONTANTCMDE").toString());
        P_TOTALMONTANTFAC = conversion.DoubleFormatToAmount(m);
        m = Double.valueOf(mtn.get("dblMONTANTRESTANT").toString());
        P_MONTANTRESTE = conversion.DoubleFormatToAmount(m);
        m = Double.valueOf(mtn.get("dblMONTANTPAYE").toString());
        P_TOTALMONTANTPAYE = conversion.DoubleFormatToAmount(m);
    }

    parameters.put("P_TOTAL_GENERAL", P_TOTAL_GENERAL);
    parameters.put("P_TOTALMONTANTPAYE", P_TOTALMONTANTPAYE);
    parameters.put("P_MONTANTRESTE", P_MONTANTRESTE);
    parameters.put("P_TOTALMONTANTFAC", P_TOTALMONTANTFAC);

    OreportManager.BuildReport(parameters, Ojconnexion);

    ObllBase.setKey(new date());
    ObllBase.setOTranslate(OTranslate);
    ObllBase.setOTUser(OTUser);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "rp_relever_facture" + report_generate_file);

%>