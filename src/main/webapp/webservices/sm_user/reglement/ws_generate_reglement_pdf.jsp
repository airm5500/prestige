<%-- 
    Document   : ws_generate_reglement_pdf
    Created on : 8 déc. 2015, 17:24:34
    Author     : KKOFFI
--%>

<%@page import="bll.facture.reglementManager"%>
<%@page import="bll.facture.factureManagement"%>
<%@page import="bll.entity.EntityData"%>
<%@page import="dal.TTypeMvtCaisse"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TFacture"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.commandeManagement.orderManagement"%>
<%@page import="dal.TOrderDetail"%>

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
    bllBase ObllBase = new bllBase();
    factureManagement facManagement = null;
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_TIERS_PAYANT_ID = "%%", str_NAME_FILE = "";
    String dt_debut = date.formatterMysqlShort.format(new Date()), dt_fin = date.formatterMysqlShort.format(new Date());
    if (request.getParameter("lg_TIERS_PAYANT_ID") != null && !"".equals(request.getParameter("lg_TIERS_PAYANT_ID"))) {
        lg_TIERS_PAYANT_ID = request.getParameter("lg_TIERS_PAYANT_ID");
        new logger().OCategory.info("lg_TIERS_PAYANT_ID " + lg_TIERS_PAYANT_ID);
    }
    if (request.getParameter("dt_debut") != null && !"".equals(request.getParameter("dt_debut"))) {
        dt_debut = request.getParameter("dt_debut");
        new logger().OCategory.info("dt_debut " + dt_debut);
    }
    if (request.getParameter("dt_fin") != null && !"".equals(request.getParameter("dt_fin"))) {
        dt_fin = request.getParameter("dt_fin");
        new logger().OCategory.info("dt_fin " + dt_fin);
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

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();

    TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
   
    TTiersPayant OTiersPayant = obllBase.getOdataManager().getEm().find(TTiersPayant.class, lg_TIERS_PAYANT_ID);
   
    String scr_report_file = "rp_relever_reglement";
    // String scr_report_file = "rp_facture_0109";
    String report_generate_file = key.GetNumberRandom();

    new logger().OCategory.info("scr_report_file " + scr_report_file);
     report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    scr_report_file = scr_report_file+report_generate_file + ".pdf";
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_relever_reglement" + report_generate_file);

// parameters.put("P_TOTAL_DEVIS", conversion.GetNumberTowords(Double.parseDouble(total_devis + "")) + " -- (" + conversion.AmountFormat(total_devis) +")");
    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
    String P_H_CLT_INFOS = "PERIODE DU " + date.formatterShort.format(java.sql.Date.valueOf(dt_debut)) + " AU " + date.formatterShort.format(java.sql.Date.valueOf(dt_fin));
    if (dt_debut.equals(dt_fin) || "".equals(dt_fin)) {
        P_H_CLT_INFOS = "PERIODE DU " + date.formatterShort.format(java.sql.Date.valueOf(dt_debut));
       // dt_fin=dt_debut + " 23:59";
    }
    if (!"".equals(dt_fin)) {
        dt_fin = dt_fin + " 23:59";
    }

    String P_H_LOGO = jdom.scr_report_file_logo;

    Map parameters = new HashMap();
    parameters.put("P_H_LOGO", P_H_LOGO);
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_H_CLT_INFOS", "RELEVE REGLEMENT\n"+P_H_CLT_INFOS);

    
    parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
    parameters.put("P_DATE_END", dt_fin);
    parameters.put("P_DATE_START", dt_debut);
    parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
    parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OTiersPayant.getStrCODECOMPTABLE());
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
        List<EntityData> list=new ArrayList<>();
       reglementManager OreManager=new reglementManager(OdataManager, null);
    list = OreManager.getReleverReglementData(lg_TIERS_PAYANT_ID, date.formatterMysqlShort.parse(dt_debut), date.formatterMysql2.parse(dt_fin));
    
        long P_TOTAL_AMOUNT_ATT = 0l,P_TOTAL_AMOUNT_RESTANT=0l ;
    int count = 0;
    for (EntityData OEntityData: list) {
      P_TOTAL_AMOUNT_ATT+=Double.valueOf(OEntityData.getStr_value1()); 
      P_TOTAL_AMOUNT_RESTANT+=Double.valueOf(OEntityData.getStr_value2()); 
    }
    
     parameters.put("P_TOTAL_AMOUNT_ATT", conversion.AmountFormat((int) P_TOTAL_AMOUNT_ATT, ' '));
     parameters.put("P_TOTAL_AMOUNT_RESTANT", conversion.AmountFormat((int)P_TOTAL_AMOUNT_RESTANT, ' ')); 
     
    if(!"".equals(P_H_CI_P_H_RI)){
         parameters.put("P_H_CI","CI:"+P_H_CI_P_H_RI);
   }else{
         parameters.put("P_H_CI"," ");
   }
   if(!"".equals(P_H_CC_P_H_RC)){
         parameters.put("P_H_CC","CC:"+P_H_CC_P_H_RC);
   }else{
         parameters.put("P_H_CC"," ");
   }
   
    
   String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                }
            }
            parameters.put("P_H_PHONE", finalphonestring);
          
    facManagement = new factureManagement(OdataManager, OTUser);

    parameters.put("P_TOTAL_GENERAL", "TOTAL :" + OTiersPayant.getStrNAME());

    OreportManager.BuildReport(parameters, Ojconnexion);

    ObllBase.setKey(new date());
    ObllBase.setOTranslate(OTranslate);
    ObllBase.setOTUser(OTUser);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/"+"rp_relever_reglement" + report_generate_file);

%>


