<%@page import="bll.common.Parameter"%>
<%@page import="bll.printer.DriverPrinter"%>
<%@page import="bll.configManagement.PrinterManager"%>
<%@page import="bll.printer.PrintManangement"%>

<%@page import="toolkits.utils.conversion"%>
<%@page import="bll.preenregistrement.DevisManagement"%>
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

<%
    dataManager OdataManager = new dataManager();
    TParameters OTParameters;
    date key = new date();
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_PREENREGISTREMENT_ID = "", lg_IMPRIMANTE_ID = "%%";
    int int_NUMBER_COPY = 1;
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

    reportManager OreportManager = new reportManager();
    String scr_report_file = "rp_facture_vente";

    String report_generate_file = key.GetNumberRandom();

    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "bon_livraison_devis_" + report_generate_file);

    OdataManager.initEntityManager();
    Preenregistrement OPreenregistrement = new Preenregistrement(OdataManager, OTUser);
   

    TPreenregistrement oTPreenregistrement = OdataManager.getEm().find(TPreenregistrement.class, lg_PREENREGISTREMENT_ID);
    TOfficine oTOfficine = OdataManager.getEm().find(TOfficine.class, "1");

    new logger().OCategory.info(" ****   lg_preenregistrement_id depuis generate pdf   ****  HHHHH" + oTPreenregistrement.getLgPREENREGISTREMENTID() + " " + oTOfficine.getStrNOMCOMPLET());

    String P_H_CLT_INFOS = "BON DE LIVRAISON";
    new logger().OCategory.info(" **** P_H_CLT_INFOS   ****" + P_H_CLT_INFOS);

    barecodeManager obarecodeManager = new barecodeManager();
    String fileBarecode = obarecodeManager.buildLineBarecode(oTPreenregistrement.getLgPREENREGISTREMENTID());
    Map parameters = new HashMap();

    parameters.put("P_H_LOGO", jdom.scr_report_file_logo);
    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
    parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    parameters.put("P_PRINTED_BY", " Caissier(e) :: " + " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC", "  ");
    parameters.put("P_REFERENCE", oTPreenregistrement.getLgPREENREGISTREMENTID());
    parameters.put("P_BARE_CODE", jdom.barecode_file + "" + fileBarecode + ".jpg");
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
    long int_TOTAL_TVA=OPreenregistrement.getMontantTvaByVente(oTPreenregistrement.getLgPREENREGISTREMENTID()); 
    parameters.put("int_TOTAL_TVA",int_TOTAL_TVA+"" );
    parameters.put("P_PATH_SUBREPORT", Ojdom.scr_report_file);

   int P_TOTALNETTTC=oTPreenregistrement.getIntPRICE()-oTPreenregistrement.getIntPRICEREMISE();
  int  P_TOTALREMISETTC=oTPreenregistrement.getIntPRICEREMISE(); 
    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
    parameters.put("P_TOTALNETTTC", conversion.AmountFormat((int) P_TOTALNETTTC, ' '));
     parameters.put("P_TOTALREMISETTC", conversion.AmountFormat((int) P_TOTALREMISETTC, ' '));
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

   
    
    
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
        P_INSTITUTION_ADRESSE += " - Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE());
    }
    if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
        P_INSTITUTION_ADRESSE += " - Compte Banquaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
    }
      parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
    parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    OreportManager.BuildReport(parameters, Ojconnexion);
    Ojconnexion.CloseConnexion();

   
    
    String str_final_file = Ojdom.scr_report_pdf + "bon_livraison_devis_" + report_generate_file;
    new logger().OCategory.info("str_final_file -----------" + str_final_file);
   

    

    //String str_final_file = Ojdom.scr_report_pdf+"facture_vente_" + report_generate_file;
     new logger().OCategory.info("***********************************************************" + str_final_file);
    
     response.sendRedirect("../../../data/reports/pdf/" + "bon_livraison_devis_" + report_generate_file);
    
   

%>



