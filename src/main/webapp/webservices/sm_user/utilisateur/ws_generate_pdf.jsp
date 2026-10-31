<%@page import="bll.userManagement.user"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.configManagement.PrinterManager"%>
<%@page import="bll.printer.PrintManangement"%>
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
 
    dataManager OdataManager = new dataManager();
  TRole OTRole = null;

%>


<!-- fin logic de gestion des page -->

<%    String search_value = "", lg_IMPRIMANTE_ID = "2";
    int int_NUMBER_COPY = 1;
    boolean etat = false;

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }
    
      
    if (request.getParameter("etat") != null) {
        etat = Boolean.parseBoolean(request.getParameter("etat"));
        new logger().OCategory.info("etat " + etat);
    }

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();
   // String scr_report_file = "rp_liste_utilisateur";
    String scr_report_file = "rp_liste_utilisateur_admin";
    String report_generate_file = key.GetNumberRandom();
     OdataManager.initEntityManager();
     user Ouser = new user(OdataManager);
    TOfficine oTOfficine = OdataManager.getEm().find(TOfficine.class, "1");
    OTRole = Ouser.getTRoleUser(OTUser.getLgUSERID()).getLgROLEID();

    if(OTRole != null) {
       /* if(OTRole.getStrNAME().equalsIgnoreCase(commonparameter.ROLE_ADMIN)) { //a decommenter en cas de besoin
            scr_report_file = "rp_liste_utilisateur_admin";
        } else*/ if(user.estRoleSuperAdmin(OTRole)) {
            scr_report_file = "rp_liste_utilisateur_superadmin";
        }
    }
    
    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "liste_utilisateur_" + report_generate_file);
    new logger().OCategory.info("Dans edition scr_report_file " + scr_report_file);
   

    String P_H_CLT_INFOS = "Liste des utilisateurs";
    Map parameters = new HashMap();

    parameters.put("P_H_LOGO", jdom.scr_report_file_logo);
    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
    parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_H_CC_RC", ((oTOfficine.getStrCOMPTECONTRIBUABLE() != null && !oTOfficine.getStrCOMPTECONTRIBUABLE().equalsIgnoreCase("")) ? "CC:" + oTOfficine.getStrCOMPTECONTRIBUABLE() : "") + ((oTOfficine.getStrREGISTRECOMMERCE() != null && !oTOfficine.getStrREGISTRECOMMERCE().equalsIgnoreCase("")) ? " / RC: " + oTOfficine.getStrREGISTRECOMMERCE() : ""));

    parameters.put("P_H_CI_RI", ((oTOfficine.getStrCENTREIMPOSITION() != null && !oTOfficine.getStrCENTREIMPOSITION().equalsIgnoreCase("")) ? "CI:" + oTOfficine.getStrCENTREIMPOSITION() : "") + ((oTOfficine.getStrREGISTREIMPOSITION() != null && !oTOfficine.getStrREGISTREIMPOSITION().equalsIgnoreCase("")) ? " / RI: " + oTOfficine.getStrREGISTREIMPOSITION() : ""));
parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_H_PHONE", (oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : ""));
    parameters.put("P_EMPLACEMENT", (etat ? "%%" : OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID()));
    parameters.put("P_SEARCH", search_value + "%");

    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS.toUpperCase());

    new logger().OCategory.info("getStrADRESSSEPOSTALE" + oTOfficine.getStrADRESSSEPOSTALE());
    OreportManager.BuildReport(parameters, Ojconnexion);

    Ojconnexion.CloseConnexion();

    /*PrinterManager OPrinterManager = new PrinterManager(OdataManager, OTUser);
    TUserImprimante OTUserImprimante = OPrinterManager.getTUserImprimante(OTUser.getLgUSERID(), lg_IMPRIMANTE_ID);
    PrintManangement OPrintManangement = new PrintManangement();
    String str_final_file = Ojdom.scr_report_pdf + "liste_utilisateur_" + report_generate_file;
    new logger().OCategory.info("str_final_file -----------" + str_final_file);

     OPrintManangement.doPrintDataByPrinterName(OTUserImprimante.getLgIMPRIMANTEID().getStrNAME(), str_final_file, int_NUMBER_COPY);
    OPrintManangement.setMessage(commonparameter.PROCESS_SUCCESS);
        OPrintManangement.setDetailmessage("Opération effectuée avec succès");*/
  /*   if (OTUserImprimante != null) {
        OPrintManangement.doPrintDataByPrinterName(OTUserImprimante.getLgIMPRIMANTEID().getStrNAME(), str_final_file, int_NUMBER_COPY);
        OPrintManangement.setMessage(commonparameter.PROCESS_SUCCESS);
        OPrintManangement.setDetailmessage("Opération effectuée avec succès");
    } else {
        OPrintManangement.setMessage(commonparameter.PROCESS_FAILED);
        OPrintManangement.setDetailmessage("Echec d'impression du document");

    }*/

    response.sendRedirect("../../../data/reports/pdf/" + "liste_utilisateur_" + report_generate_file);
   /* String result;
    if (OPrintManangement.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + OPrintManangement.getMessage() + "\", errors: \"" + OPrintManangement.getDetailmessage() + "\"}";

    } else {
        result = "{success:\"" + OPrintManangement.getMessage() + "\", errors: \"" + OPrintManangement.getDetailmessage() + "\"}";
    }
    new logger().OCategory.info("JSON " + result);*/

%>



