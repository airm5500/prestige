<%-- 
    Document   : ws_operateur_pdf
    Created on : 20 janv. 2016, 10:08:02
    Author     : KKOFFI
--%>

<%@page import="org.json.JSONArray"%>
<%@page import="bll.stockManagement.StockManager"%>
<%@page import="java.text.DateFormat"%>
<%@page import="java.text.SimpleDateFormat"%>
<%@page import="bll.report.JsonDataSourceApp"%>
<%@page import="org.json.JSONObject"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>JSP Page</title>
    </head>
    <%@page import="java.math.RoundingMode"%>
    <%@page import="java.math.BigDecimal"%>
    <%@page import="bll.common.Parameter"%>
    <%@page import="bll.report.StatisticSales"%>
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
        TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        dataManager OdataManager = new dataManager();

        String str_TYPE_TRANSACTION = "%%", lg_ZONE_GEO_ID = "", lg_FAMILLEARTICLE_ID = "", search_value = "", lg_GROSSISTE_ID = "";
        int int_NUMBER = 0;
        boolean undefined = true;
        if (request.getParameter("int_NUMBER") != null && !"".equals(request.getParameter("int_NUMBER"))) {
            int_NUMBER = new Integer(request.getParameter("int_NUMBER"));
            undefined = false;
        }
        if (request.getParameter("search_value") != null) {
            search_value = request.getParameter("search_value");
        }
        if (request.getParameter("str_TYPE_TRANSACTION") != null && request.getParameter("str_TYPE_TRANSACTION") != "") {
            str_TYPE_TRANSACTION = request.getParameter("str_TYPE_TRANSACTION");
        }

        if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && request.getParameter("lg_FAMILLEARTICLE_ID") != "") {
            lg_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
        }
        if (request.getParameter("lg_ZONE_GEO_ID") != null && request.getParameter("lg_ZONE_GEO_ID") != "") {
            lg_ZONE_GEO_ID = request.getParameter("lg_ZONE_GEO_ID");
        }
        if (request.getParameter("lg_GROSSISTE_ID") != null && request.getParameter("lg_GROSSISTE_ID") != "") {
            lg_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
        }

       

        OdataManager.initEntityManager();

        TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
        Map parameters = new HashMap();
      //  String scr_report_file = "rp_etatdestock";
        String periode = date.formatterShort.format(new Date());
        String P_PERIODE = " AU " + periode;
        String title = "";
        
        if (!undefined) {
          
            if (str_TYPE_TRANSACTION.equals(Parameter.LESS)) {

               
                title = "Stock  INFERIEUR  A " + int_NUMBER + " " + P_PERIODE;
            } else if (str_TYPE_TRANSACTION.equals(Parameter.MORE)) {

              
                title = "Stock  SUPERIEUR A " + int_NUMBER + " " + P_PERIODE;
            } else if (str_TYPE_TRANSACTION.equals(Parameter.MOREOREQUAL)) {
               
                title = "Stock  SUPERIEUR OU EQUAL A " + int_NUMBER + " " + P_PERIODE;
            } else if (str_TYPE_TRANSACTION.equals(Parameter.EQUAL)) {
               
                title = "Stock   EQUAL A " + int_NUMBER + " " + P_PERIODE;
            } else if (str_TYPE_TRANSACTION.equals(Parameter.LESSOREQUAL)) {
               
                title = "Stock  INFERIEUR OU EQUAL A " + int_NUMBER + " " + P_PERIODE;

            }

        } else {
            title = "Etat du Stock " + P_PERIODE;
        }

        String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
        String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();

        /* 13/10 : noms des rayons, familles et grossistes filtres */
        String filtresNoms = rest.service.impl.LibellesFiltres.ligne(OdataManager.getEm(), lg_ZONE_GEO_ID, lg_FAMILLEARTICLE_ID, lg_GROSSISTE_ID);
        parameters.put("P_H_CLT_INFOS", title + (filtresNoms.isEmpty() ? "" : " \n " + filtresNoms));

        String P_H_LOGO = jdom.scr_report_file_logo;

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

        parameters.put("P_H_LOGO", P_H_LOGO);
        parameters.put("P_INT_NUMBER", int_NUMBER);

        parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

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
        parameters.put("P_SEARCH", search_value + "%");
        String lg_TYPE_STOCK_ID = "1";
        parameters.put("lg_TYPE_STOCK_ID", lg_TYPE_STOCK_ID);

        parameters.put("lg_FAMILLEARTICLE_ID", lg_FAMILLEARTICLE_ID);
        parameters.put("lg_ZONE_GEO_ID", lg_ZONE_GEO_ID);
        parameters.put("lg_GROSSISTE_ID", lg_GROSSISTE_ID);
        String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
        if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
            String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
            for (String va : phone) {
                finalphonestring += " / " + conversion.PhoneNumberFormat(va);
            }
        }
        parameters.put("P_H_PHONE", finalphonestring);
        StockManager manager = new StockManager(OdataManager, OTUser);
        JSONArray arrayObj = manager.etatStockRepport(str_TYPE_TRANSACTION, search_value, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID, lg_GROSSISTE_ID, int_NUMBER);
        JSONObject data = new JSONObject();
        data.put("root", arrayObj);
        JsonDataSourceApp app = new JsonDataSourceApp();
        DateFormat DATEFORMAT = new SimpleDateFormat("HH_mm_ss");
        String fileName = "rp_etatdestock_" + DATEFORMAT.format(new Date()) + ".pdf";
        app.fill(parameters, data, jdom.scr_report_file + "rp_etatdestock.jrxml", fileName);

        response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + fileName);

    %>



</html>
