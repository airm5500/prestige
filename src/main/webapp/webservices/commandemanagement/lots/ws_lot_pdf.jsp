<%-- 
    Document   : ws_operateur_pdf
    Created on : 20 janv. 2016, 10:08:02
    Author     : KKOFFI
--%>

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
        String dt_start = date.formatterMysqlShort.format(new Date());
        String dt_end = date.formatterMysqlShort.format(new Date()), search_value = "%%";

        if (request.getParameter("dt_start_vente") != null && !"".equals(request.getParameter("dt_start_vente"))) {
            dt_start = request.getParameter("dt_start_vente");
            System.out.println("dt_start_vente   " + request.getParameter("dt_start_vente"));
        }
        if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
            search_value = request.getParameter("search_value");

        }

        if (request.getParameter("dt_end_vente") != null && !"".equals(request.getParameter("dt_end_vente"))) {
            dt_end = request.getParameter("dt_end_vente");
        }

        TParameters OTParameters;
        jdom Ojdom = new jdom();
        Ojdom.InitRessource();
        Ojdom.LoadRessource();
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        date key = new date();
        reportManager OreportManager = new reportManager();
        OdataManager.initEntityManager();
        StatisticSales statisticSales = new StatisticSales(OdataManager);

        TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
        Map parameters = new HashMap();
        String scr_report_file = "rp_ListLots";
        String report_generate_file = key.GetNumberRandom();

        report_generate_file = report_generate_file + ".pdf";
        OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
        OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_ListLots_" + report_generate_file);
        String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
        String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
        String periode = date.formatterShort.format(java.sql.Date.valueOf(dt_start));
        String P_PERIODE = "PERIODE DU " + periode;
        if (!"".equals(dt_end) && !dt_end.equals(dt_start)) {
            P_PERIODE = "DU " + periode + " AU " + date.formatterShort.format(java.sql.Date.valueOf(dt_end));
            parameters.put("P_DATE_END", dt_end);
        } else {
            parameters.put("P_DATE_END", date.formatterMysql.format(new Date()));
        }
        parameters.put("P_DATE_START", dt_start);
        parameters.put("P_H_CLT_INFOS", "Liste des Lots\n" + P_PERIODE);

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
        parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
        String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
        if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
            String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
            for (String va  : phone) {
                finalphonestring += " / " + conversion.PhoneNumberFormat(va);
            }
        }
        parameters.put("P_H_PHONE", finalphonestring);

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

        OreportManager.BuildReport(parameters, Ojconnexion);

        Ojconnexion.CloseConnexion();

        response.sendRedirect("../../../data/reports/pdf/" + "rp_ListLots_" + report_generate_file);

    %>



</html>
