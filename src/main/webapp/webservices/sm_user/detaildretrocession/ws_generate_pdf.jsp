<%@page import="bll.retrocessionManagement.RetrocessionManagement"%>
<%@page import="dal.TRetrocession"%>
<%@page import="bll.common.Parameter"%>
<%@page import="bll.printer.DriverPrinter"%>
<%@page import="bll.configManagement.PrinterManager"%>
<%@page import="bll.printer.PrintManangement"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TOfficine"%>
<%@page import="cust_barcode.barecodeManager"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="dal.TTypeReglement"%>
<%@page import="dal.TCashTransaction"%>
<%@page import="dal.TRetrocession"%>
<%@page import="dal.TRetrocessionDetail"%>
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
    OdataManager.initEntityManager();
    TParameters OTParameters;
    date key = new date();
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_RETROCESSION_ID = "";
    if (request.getParameter("lg_RETROCESSION_ID") != null) {
        lg_RETROCESSION_ID = request.getParameter("lg_RETROCESSION_ID");
        new logger().OCategory.info("lg_RETROCESSION_ID " + lg_RETROCESSION_ID);
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OTUser = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();

    reportManager OreportManager = new reportManager();
    String scr_report_file = "rp_facture_retrocession";

    String report_generate_file = key.GetNumberRandom();

    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "facture_retrocession_" + report_generate_file);

    OdataManager.initEntityManager();
    RetrocessionManagement ORetrocessionManagement = new RetrocessionManagement(OdataManager, OTUser);
    TRetrocession oTRetrocession = OdataManager.getEm().find(TRetrocession.class, lg_RETROCESSION_ID);
    TOfficine oTOfficine = OdataManager.getEm().find(TOfficine.class, "1");

    String P_H_CLT_INFOS = "FACTURATION RETROCESSION";

    barecodeManager obarecodeManager = new barecodeManager();
    String fileBarecode = obarecodeManager.buildLineBarecode(oTRetrocession.getLgRETROCESSIONID());
    Map parameters = new HashMap();

    parameters.put("P_H_LOGO", jdom.scr_report_file_logo);
    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
   // parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    parameters.put("P_PRINTED_BY", " Opérateur :: " + " " + oTRetrocession.getLgUSERID().getStrFIRSTNAME() + "  " + oTRetrocession.getLgUSERID().getStrLASTNAME());
    parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_REFERENCE", oTRetrocession.getLgRETROCESSIONID());
    parameters.put("P_BARE_CODE", jdom.barecode_file + "" + fileBarecode + ".jpg");
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
    long int_TOTAL_TVA=ORetrocessionManagement.getMontantTvaByRetrocession(oTRetrocession.getLgRETROCESSIONID()); 
    parameters.put("int_TOTAL_TVA",int_TOTAL_TVA+"" );
    parameters.put("P_PATH_SUBREPORT", Ojdom.scr_report_file);

   // String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
    parameters.put("P_TOTALNETTTC", conversion.AmountFormat((int) (oTRetrocession.getIntMONTANTTTC() - ((oTRetrocession.getIntMONTANTTTC() * oTRetrocession.getIntREMISE())/100)), ' '));
    parameters.put("P_TOTALNEHT", conversion.AmountFormat((int) oTRetrocession.getIntMONTANTHT(), ' '));
    
     parameters.put("P_TOTALREMISETTC", conversion.AmountFormat((int) ((oTRetrocession.getIntMONTANTTTC() * oTRetrocession.getIntREMISE())/100), ' '));
   /* parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());*/
    

   
    
    
         String P_FOOTER_RC = "";

    if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
        P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
    }

    if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
        P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
    }
    if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
        P_FOOTER_RC += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
    }
    if (oTOfficine.getStrCENTREIMPOSITION() != null) {
        P_FOOTER_RC += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
    }
         if (oTOfficine.getStrPHONE() != null) {
        String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
        if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
            String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
            for (String va : phone) {
                finalphonestring += " / " + conversion.PhoneNumberFormat( va);
            }
        }
       
        
        P_INSTITUTION_ADRESSE += " -  " +finalphonestring;
    }
    if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
        P_INSTITUTION_ADRESSE += " - Compte Banquaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
    }
      parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    OreportManager.BuildReport(parameters, Ojconnexion);
    Ojconnexion.CloseConnexion();

   
    
    String str_final_file = Ojdom.scr_report_pdf + "facture_retrocession_" + report_generate_file;
    new logger().OCategory.info("str_final_file -----------" + str_final_file);
   

    

    //String str_final_file = Ojdom.scr_report_pdf+"facture_retrocession_" + report_generate_file;
     new logger().OCategory.info("***********************************************************" + str_final_file);
    
     response.sendRedirect("../../../data/reports/pdf/" + "facture_retrocession_" + report_generate_file);
    
   

%>



