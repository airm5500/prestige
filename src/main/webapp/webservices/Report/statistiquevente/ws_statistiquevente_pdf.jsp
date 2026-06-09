<%@page import="java.time.LocalDate"%>
<%@page import="java.math.RoundingMode"%>
<%@page import="java.math.BigDecimal"%>
<%@page import="bll.report.StatisticSales"%>
<%@page import="dal.TOfficine"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="java.util.*"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>
<!-- fin logic de gestion des page -->

<%
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    dataManager OdataManager = new dataManager();
    LocalDate now = LocalDate.now();
    String dt_start = now.minusMonths(1).toString();
    String dt_end = LocalDate.now().toString();

    if (request.getParameter("dt_start_vente") != null && !"".equals(request.getParameter("dt_start_vente"))) {
        dt_start = request.getParameter("dt_start_vente");

    }

    if (request.getParameter("dt_end_vente") != null && !"".equals(request.getParameter("dt_end_vente"))) {
        dt_end = request.getParameter("dt_end_vente");

    }
    LocalDate begin = LocalDate.parse(dt_start);
    LocalDate end = LocalDate.parse(dt_end);

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

    String scr_report_file = "rp_statistic_ventes";
    String report_generate_file = key.GetNumberRandom();

    new logger().OCategory.info("scr_report_file " + scr_report_file);
    report_generate_file = report_generate_file + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_statistic_ventes" + report_generate_file);

    String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
    String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
    String periode = date.FORMATTERMOUNTHFULLYEAR.format(java.sql.Date.valueOf(dt_start));
    if ("".equals(dt_end)) {
        dt_end = date.formatterMysqlShort.format(new Date());
        periode += " Au " + date.FORMATTERMOUNTHFULLYEAR.format(java.sql.Date.valueOf(dt_end));
    } else if (!date.FORMATTERMOUNTH.format(java.sql.Date.valueOf(dt_start)).equals(date.FORMATTERMOUNTH.format(java.sql.Date.valueOf(dt_end)))) {

        periode += " Au " + date.FORMATTERMOUNTHFULLYEAR.format(java.sql.Date.valueOf(dt_end));
    }

    String P_H_CLT_INFOS = "Statistiques des Ventes\n periode du " + periode;
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

    Map parameters = new HashMap();
    parameters.put("P_H_LOGO", P_H_LOGO);
    parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
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
    parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
    String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";

    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
        for (String va : phone) {
            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
        }
    }
    parameters.put("P_H_PHONE", finalphonestring);

    /* statistiques mensuelles agregees (valeurs du mois + cumuls de l'annee civile) */
    JSONArray stats = statisticSales.getSalesStatistics(dt_start, dt_end, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
    Map<String, JSONObject> statsByMonth = new HashMap<>();
    for (int i = 0; i < stats.length(); i++) {
        JSONObject o = stats.getJSONObject(i);
        statsByMonth.put(o.getInt("year") + "_" + o.getInt("num"), o);
    }

    /* le jrxml comporte 12 emplacements de mois : sur une meme annee on affiche les 12 mois civils,
       sinon les 12 premiers mois a partir du debut de la periode */
    LocalDate firstSlotMonth = (begin.getYear() == end.getYear())
            ? LocalDate.of(begin.getYear(), 1, 1)
            : LocalDate.of(begin.getYear(), begin.getMonthValue(), 1);

    for (int slot = 1; slot <= 12; slot++) {
        LocalDate slotMonth = firstSlotMonth.plusMonths(slot - 1);
        String prefix = "P_MONTH_" + slot;
        parameters.put(prefix, String.format("%02d/%d", slotMonth.getMonthValue(), slotMonth.getYear()));
        JSONObject o = statsByMonth.get(slotMonth.getYear() + "_" + slotMonth.getMonthValue());
        if (o != null && o.getInt("NB_CLIENT") > 0) {
            parameters.put(prefix + "_NCLIENT", conversion.AmountFormat(o.getInt("NB_CLIENT"), ' '));
            parameters.put(prefix + "_NCLIENT_CUMUL", conversion.AmountFormat(o.getInt("NB_CLIENTCUMUL"), ' '));
            parameters.put(prefix + "_BRUTTTC", conversion.AmountFormat((int) o.getDouble("BRUT_TTC"), ' '));
            parameters.put(prefix + "_BRUTTTC_CUMUL", conversion.AmountFormat((int) o.getDouble("MONTANT_BRUTCUMUL"), ' '));
            parameters.put(prefix + "_NETTTC", conversion.AmountFormat((int) o.getDouble("NET_TTC"), ' '));
            parameters.put(prefix + "_NETTTC_CUMUL", conversion.AmountFormat((int) o.getDouble("MONTANT_NETCUMUL"), ' '));
            parameters.put(prefix + "_REMISE", conversion.AmountFormat((int) o.getDouble("REMISE"), ' '));
            parameters.put(prefix + "_REMISE_CUMUL", conversion.AmountFormat((int) o.getDouble("MONTANT_REMISECUMUL"), ' '));
            parameters.put(prefix + "_VENTESVO", conversion.AmountFormat((int) o.getDouble("AMOUT_VO"), ' '));
            parameters.put(prefix + "_VENTESVO_CUMUL", conversion.AmountFormat((int) o.getDouble("MONTANT_VOCUMUL"), ' '));
            parameters.put(prefix + "_VENTESVNO", conversion.AmountFormat((int) o.getDouble("AMOUT_VNO"), ' '));
            parameters.put(prefix + "_VENTESVNO_CUMUL", conversion.AmountFormat((int) o.getDouble("MONTANT_VNOCUMUL"), ' '));
            parameters.put(prefix + "_PANORD", o.getLong("PANIER_MOYEN_M_VO") + "");
            parameters.put(prefix + "_PANORD_CUMUL", o.getLong("PANIER_MOYEN_M_VO_CUMUL") + "");
            parameters.put(prefix + "_PANNO", o.getLong("PANIER_MOYEN_M_VNO") + "");
            parameters.put(prefix + "_PANNO_CUMUL", o.getLong("PANIER_MOYEN_M_VNO_CUMUL") + "");
            parameters.put(prefix + "_VNOPERCENT_MONTH", new BigDecimal(o.getDouble("vno_month_percent")).setScale(2, RoundingMode.HALF_UP));
            parameters.put(prefix + "_VNOPERCENT_CUMUL", new BigDecimal(o.getDouble("vno_cumul_percent")).setScale(2, RoundingMode.HALF_UP));
            parameters.put(prefix + "_VOPERCENT_MONTH", new BigDecimal(o.getDouble("vo_month_percent")).setScale(2, RoundingMode.HALF_UP));
            parameters.put(prefix + "_VOPERCENT_CUMUL", new BigDecimal(o.getDouble("vo_cumul_percent")).setScale(2, RoundingMode.HALF_UP));
        } else {
            parameters.put(prefix + "_NCLIENT", "");
            parameters.put(prefix + "_NCLIENT_CUMUL", "");
            parameters.put(prefix + "_BRUTTTC", "");
            parameters.put(prefix + "_BRUTTTC_CUMUL", "");
            parameters.put(prefix + "_NETTTC", "");
            parameters.put(prefix + "_NETTTC_CUMUL", "");
            parameters.put(prefix + "_REMISE", "");
            parameters.put(prefix + "_REMISE_CUMUL", "");
            parameters.put(prefix + "_VENTESVO", "");
            parameters.put(prefix + "_VENTESVO_CUMUL", "");
            parameters.put(prefix + "_VENTESVNO", "");
            parameters.put(prefix + "_VENTESVNO_CUMUL", "");
            parameters.put(prefix + "_PANORD", "");
            parameters.put(prefix + "_PANORD_CUMUL", "");
            parameters.put(prefix + "_PANNO", "");
            parameters.put(prefix + "_PANNO_CUMUL", "");
            parameters.put(prefix + "_VNOPERCENT_MONTH", "");
            parameters.put(prefix + "_VNOPERCENT_CUMUL", "");
            parameters.put(prefix + "_VOPERCENT_MONTH", "");
            parameters.put(prefix + "_VOPERCENT_CUMUL", "");
        }
    }

    OreportManager.BuildReport(parameters, Ojconnexion);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "rp_statistic_ventes" + report_generate_file);

%>
