<%-- 
    Document   : ws_operateur_pdf
    Created on : 20 janv. 2016, 10:08:02
    Author     : KKOFFI
--%>

<%@page import="toolkits.utils.Util"%>
<%@page import="org.json.JSONArray"%>
<%@page import="org.json.JSONObject"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title></title>
    </head>

    <%@page import="bll.common.Parameter"%>


    <%@page import="toolkits.utils.conversion"%>


    <%@page import="dal.TOfficine"%>
    <%@page import="cust_barcode.barecodeManager"%>
    <%@page import="dal.TParameters"%>
    <%@page import="toolkits.utils.jdom"%>
    <%@page import="dal.jconnexion"%>
    <%@page import="report.reportManager"%>


    <%@page import="toolkits.utils.logger"  %>
    <%@page import="dal.dataManager"  %>
    <%@page import="dal.TUser"  %>

    <%@page import="bll.bllBase"  %>
    <%@page import="java.util.*"  %>

    <%@page import="toolkits.utils.date"  %>

    <%@page import="toolkits.parameters.commonparameter"  %>
    <%
        TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        dataManager OdataManager = new dataManager();

        String search_value = "%%", search = "%%";
        String dt_start = date.formatterMysqlShort.format(new Date()), dt_end = dt_start;

        if (request.getParameter("dt_end") != null && !"".equals(request.getParameter("dt_end"))) {
            dt_end = request.getParameter("dt_end");
        }

        if (request.getParameter("dt_start") != null && !"".equals(request.getParameter("dt_start"))) {
            dt_start = request.getParameter("dt_start");
        }
        if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
            search_value = request.getParameter("search_value");
        }
        if (request.getParameter("search") != null && !"".equals(request.getParameter("search"))) {
            search = request.getParameter("search");
        }

        String pdf_file_name = "rp_activity";

      
        jdom Ojdom = new jdom();
        Ojdom.InitRessource();
        Ojdom.LoadRessource();
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        date key = new date();
        reportManager OreportManager = new reportManager();
        OdataManager.initEntityManager();
        GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());
        String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONObject Obj = groupeCtl.getRecap(dt_start, dt_end, empl);

        TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
        Map parameters = new HashMap();
        String scr_report_file = pdf_file_name;
        String report_generate_file = date.FILENAME.format(new Date());

        new logger().OCategory.info("scr_report_file " + scr_report_file);
        report_generate_file = report_generate_file + ".pdf";
        OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
        OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + pdf_file_name + report_generate_file);

        String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
        String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
        String periode = date.formatterShort.format(java.sql.Date.valueOf(dt_start));
        String P_PERIODE = "AU :" + periode;
        if (!"".equals(dt_end) && !dt_end.equals(dt_start)) {
            P_PERIODE = "DU " + periode + " AU " + date.formatterShort.format(java.sql.Date.valueOf(dt_end));

        }

        parameters.put("P_H_CLT_INFOS", "RAPPORT PERIODIQUE D'ACTIVITE " + P_PERIODE);

        String P_H_LOGO = jdom.scr_report_file_logo;

        parameters.put("P_H_LOGO", P_H_LOGO);
        parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

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
            String finalphonestring = oTOfficine.getStrPHONE() != null ? "- Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                }
            }
            P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
        }
        if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
            P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
        }
        if (oTOfficine.getStrNUMCOMPTABLE() != null) {
            P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
        }
        JSONArray recettes = Obj.optJSONArray("recettes");
        JSONArray tva = Obj.optJSONArray("datatva");
        String tva0 = "";
        String tva18 = "";
        for (int idx = 0; idx < tva.length(); idx++) {
            JSONObject js = tva.optJSONObject(idx);
            if (js.getInt("value") == 0) {
                tva0 = js.getString("montant");
            } else {
                tva18 = js.getString("montant");
            }

        }
        StringBuilder sb = new StringBuilder();
        if (recettes != null) {
            for (int idx = 0; idx < recettes.length(); idx++) {
                JSONObject json = recettes.optJSONObject(idx);

                sb.append("<span style='font-weight:900;'><strong><b>"+json.optString("name")).append(": "+"</b><strong></span>").append(json.optString("montant")).append(" ").append("CFA").append("&nbsp;&nbsp;");
                if ((idx % 3 == 0) && (idx > 0)) {
                    sb.append("<br><br>");
                }
            }
        }
        JSONArray grossistes = groupeCtl.getGrossisteAchats(dt_start, dt_end).getJSONArray("data");
        JSONObject data = groupeCtl.getMvt(dt_start, dt_end);
        StringBuilder mvts = new StringBuilder();
        JSONArray mv = data.optJSONArray("data");

        long totalmvt = 0;
        if (mv != null) {
            for (int idx = 0; idx < mv.length(); idx++) {
                JSONObject json = mv.optJSONObject(idx);
                if ((idx % 3 == 0) && (idx > 0)) {
                    mvts.append("<br><br>");
                }
                totalmvt += json.optLong("totalmvt");
                mvts.append("<span style='font-weight:900;'><strong><b>"+ json.optString("mvt")+"</b><strong></span>").append(": ").append(json.optString("montant")).append(" ").append("CFA").append("&nbsp;&nbsp;");
                
            }
           
        }
        JSONObject achats = Obj.optJSONObject("achats");

        JSONObject laborex = grossistes.getJSONObject(0);
        parameters.put("LABOLIB", laborex.optString("grossiste"));
        parameters.put("LABOHT", laborex.optString("th") );
        parameters.put("LABOTVA", laborex.optString("tva") );
        parameters.put("LABOTTC", laborex.optString("ttc") );

        JSONObject cop = grossistes.getJSONObject(1);
        parameters.put("COPHARMEDLIB", cop.optString("grossiste"));
        parameters.put("COPHARMEDHT", cop.optString("th") );
        parameters.put("COPHARMEDTVA", cop.optString("tva") );
        parameters.put("COPHARMEDTTC", cop.optString("ttc") );

        JSONObject tedis = grossistes.getJSONObject(2);
        parameters.put("TEDISLIB", tedis.optString("grossiste"));
        parameters.put("TEDISHT", tedis.optString("th") );
        parameters.put("TEDISTVA", tedis.optString("tva") );
        parameters.put("TEDISTTC", tedis.optString("ttc") );

        JSONObject dpci = grossistes.getJSONObject(3);
        parameters.put("DPCILIB", dpci.optString("grossiste"));
        parameters.put("DPCIHT", dpci.optString("th") );
        parameters.put("DPCITVA", dpci.optString("tva") );
        parameters.put("DPCITTC", dpci.optString("ttc") );

        JSONObject autres = grossistes.getJSONObject(4);
        parameters.put("AUTRESLIB", autres.optString("grossiste"));
        parameters.put("AUTRESHT", autres.optString("th") );
        parameters.put("AUTRESTVA", autres.optString("tva") );
        parameters.put("AUTRESTTC", autres.optString("ttc") );

        parameters.put("ACHATHT", "<span style='font-weight:900;'><strong><b>Total HT</b><strong></span>: " + achats.optString("th") );
        parameters.put("ACHATTTC", "<span style='font-weight:900;'><strong><b>Total TTC</b><strong></span>: " + achats.optString("ttc") );
        parameters.put("MARGE", "<span style='font-weight:900;'><strong><b>Marge</b><strong></span>: " + achats.optString("marge") );
        parameters.put("RATIO", "<span style='font-weight:900;'><strong><b>Ratio</b><strong></span>: " + achats.optDouble("ratio"));
        parameters.put("ACHATTVA", "<span style='font-weight:900;'><strong><b>Total TVA</b><strong></span>: " + achats.optString("tva") );
        parameters.put("totalmvt", "<span style='font-weight:900;'><strong><b>Total mouvements</b><strong></span>: " + Util.getFormattedLongValue(totalmvt) );
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);
        parameters.put("P_SEARCH", search_value + "%");
        parameters.put("P_CAHT", "<span style='font-weight:900;'><strong><b>CA Total HT</b><strong></span>: " + Obj.optString("montHT"));
        parameters.put("REMISE",    "<span style='font-weight:900;'><strong><b>Total remise</b><strong></span>: " + Obj.optString("remiseHT"));
        parameters.put("COMPTANT", "<span style='font-weight:900;'><strong><b>Comptant</b><strong></span>: " + Obj.optString("VNO"));  
        parameters.put("CREDIT", "<span style='font-weight:900;'><strong><b>Crédit</b><strong></span>: " + Obj.optString("VO"));
        parameters.put("CATTC", "<span style='font-weight:900;'><strong><b>Chiffre d'Affaires TTC</b><strong></span>: " + Obj.optString("montTTC"));
        parameters.put("NET", "<span style='font-weight:900;'><strong><b>Total Net</b><strong></span>: " + Obj.optString("montantHTCNET"));
        parameters.put("RECETTES", sb.toString());   
        parameters.put("TVA0", "<span style='font-weight:900;'><strong><b>Total TVA 0 </b><strong></span>: " + tva0);
        parameters.put("TVA18", "<span style='font-weight:900;'><strong><b>Total TVA 18</b><strong></span> : " + tva18);
        parameters.put("mvts", mvts.toString());

        // L'edition suit le meme perimetre que l'ecran : l'emplacement, sauf privilege « toutes les activites ».
        java.util.List<dal.TPrivilege> lstPrivPdf =
                (java.util.List<dal.TPrivilege>) session.getAttribute(util.Constant.USER_LIST_PRIVILEGE);
        JSONArray arrayObj = groupeCtl.creditsAccordeTotax(dt_start, dt_end, search, empl, lstPrivPdf != null
                && util.DateConverter.hasAuthorityByName(lstPrivPdf, util.Constant.P_SHOW_ALL_ACTIVITY));

        JSONObject cr = arrayObj.optJSONObject(0);

        parameters.put("NBCLIENT", cr.getString("nbclient"));

        parameters.put("P_START", dt_start);
        parameters.put("P_END", dt_end);
        parameters.put("P_CRITERIA", search + "%");
        OreportManager.BuildReport(parameters, Ojconnexion);

        Ojconnexion.CloseConnexion();

        response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + pdf_file_name + report_generate_file);

    %>



</html>
