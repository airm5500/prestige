<%@page import="bll.common.Parameter"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.printer.PrintManangement"%>
<%@page import="bll.configManagement.PrinterManager"%>
<%@page import="dal.TBonLivraison"%>
<%@page import="bll.commandeManagement.bonLivraisonManagement"%>
<%@page import="dal.TOrderDetail"%>
<%@page import="dal.TOrder"%>
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
     OdataManager.initEntityManager();
    TParameters OTParameters;
    bllBase ObllBase = new bllBase();
    TUser OTUser = null;

%>


<!-- fin logic de gestion des page -->

<%    String lg_BON_LIVRAISON_ID = "", lg_GROSSISTE_ID = "", P_H_CLT_INFOS = "EDITION DES ENTREES REAPPROVISIONNEMENT",
        str_GROSSISTE_LIBELLE = "", str_STATUT = commonparameter.statut_is_Closed;

    if (request.getParameter("lg_BON_LIVRAISON_ID") != null) {
        lg_BON_LIVRAISON_ID = request.getParameter("lg_BON_LIVRAISON_ID");
        new logger().OCategory.info("lg_BON_LIVRAISON_ID " + lg_BON_LIVRAISON_ID);
    }
    if (request.getParameter("title") != null) {
        P_H_CLT_INFOS = request.getParameter("title");
        new logger().OCategory.info("title " + P_H_CLT_INFOS);
    }
    
    if (request.getParameter("lg_GROSSISTE_ID") != null) {
        lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        new logger().OCategory.info("lg_GROSSISTE_ID " + lg_GROSSISTE_ID);
    }

    if (request.getParameter("str_GROSSISTE_LIBELLE") != null) {
        str_GROSSISTE_LIBELLE = request.getParameter("str_GROSSISTE_LIBELLE");
        new logger().OCategory.info("str_GROSSISTE_LIBELLE " + str_GROSSISTE_LIBELLE);
    }
    if (request.getParameter("str_GROSSISTE_LIBELLE") != null) {
        str_GROSSISTE_LIBELLE = request.getParameter("str_GROSSISTE_LIBELLE");
        new logger().OCategory.info("str_GROSSISTE_LIBELLE " + str_GROSSISTE_LIBELLE);
    }
    if (request.getParameter("str_STATUT") != null) {
        str_STATUT = request.getParameter("str_STATUT");
        new logger().OCategory.info("str_STATUT " + str_STATUT);
    }
    
    
    

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
   
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    String scr_report_file = "rp_bon_livraison";
    String report_generate_file = key.GetNumberRandom();

    new logger().OCategory.info("scr_report_file " + scr_report_file);
    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "bon_livraison_" + report_generate_file);

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();

    TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");

    // Récupération des paramètres
    // Entete
    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
       String P_H_LOGO = jdom.scr_report_file_logo;

    bonLivraisonManagement ObonLivraisonManagement = new bonLivraisonManagement(OdataManager, user);
    TBonLivraison OBonLivraison = ObonLivraisonManagement.FindTBonLivraison(lg_BON_LIVRAISON_ID, str_STATUT);
    new logger().OCategory.info("Bon de livraison " + OBonLivraison.getLgBONLIVRAISONID());

    Map parameters = new HashMap();
    parameters.put("P_H_LOGO", P_H_LOGO);
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS.toUpperCase());

    //parameters.put("P_H_lg_ORDER_ID", OBonLivraison.getStrREFLIVRAISON());
    parameters.put("P_H_lg_ORDER_ID", OBonLivraison.getLgORDERID().getStrREFORDER());
    parameters.put("P_H_lg_BL_ID", OBonLivraison.getStrREFLIVRAISON());
    parameters.put("P_H_lg_GROSSISTE_ID", OBonLivraison.getLgORDERID().getLgGROSSISTEID().getStrLIBELLE());
    parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

    /* parameters.put("int_TVA", OBonLivraison.getIntTVA());
     parameters.put("int_MHT", OBonLivraison.getIntMHT());
     parameters.put("int_HTTC", OBonLivraison.getIntHTTC());*/
    parameters.put("P_REFERENCE", OBonLivraison.getLgBONLIVRAISONID());
    parameters.put("P_STATUT", OBonLivraison.getStrSTATUT());
    parameters.put("P_STATUT_OTHER", commonparameter.statut_is_Closed);
    
    parameters.put("P_EMPLACEMENT", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
 parameters.put("P_H_CC_RC", (oTOfficine.getStrCOMPTECONTRIBUABLE() != null ? "CC:" + oTOfficine.getStrCOMPTECONTRIBUABLE() : "") + (oTOfficine.getStrREGISTRECOMMERCE() != null ? " / RC: " + oTOfficine.getStrREGISTRECOMMERCE() : ""));

    parameters.put("P_H_CI_RI", (oTOfficine.getStrCENTREIMPOSITION() != null ? "CI:" + oTOfficine.getStrCENTREIMPOSITION() : "") + (oTOfficine.getStrREGISTREIMPOSITION() != null ? " / RI: " + oTOfficine.getStrREGISTREIMPOSITION() : ""));
parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
   
        String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + util.DateConverter.phoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + util.DateConverter.phoneNumberFormat(va);
                }
            }
            parameters.put("P_H_PHONE", finalphonestring);
           
parameters.put("P_TYPE_STOCK", (OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS) ? Parameter.STOCK_RAYON : Parameter.STOCK_DEPOT));
    OreportManager.BuildReport(parameters, Ojconnexion);

    ObllBase.setKey(new date());
    ObllBase.setOTranslate(OTranslate);
    ObllBase.setOTUser(user);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "bon_livraison_" + report_generate_file);
    
%>



