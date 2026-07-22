<%--
    Document   : ws_lots_peremptions_pdf
    Impression Jasper (rp_lots_peremptions.jrxml) de la fenetre
    "Voir les lots / peremptions" de la fiche article.
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TOfficine"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="java.util.*"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>

<%
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    dataManager OdataManager = new dataManager();

    String cip = "";
    if (request.getParameter("cip") != null) {
        cip = request.getParameter("cip").trim();
    }
    String designation = "";
    if (request.getParameter("designation") != null) {
        designation = request.getParameter("designation").trim();
    }
    int nbreMois = 24;
    if (request.getParameter("nbreMois") != null && !"".equals(request.getParameter("nbreMois"))) {
        try {
            nbreMois = Integer.parseInt(request.getParameter("nbreMois").trim());
        } catch (NumberFormatException e) {
            nbreMois = 24;
        }
    }

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();
    OdataManager.initEntityManager();

    TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
    Map parameters = new HashMap();
    String scr_report_file = "rp_lots_peremptions";
    String report_generate_file = key.GetNumberRandom() + ".pdf";

    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "rp_lots_peremptions_" + report_generate_file);

    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
    parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
        for (String va : phone) {
            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
        }
    }
    parameters.put("P_H_PHONE", finalphonestring);
    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + " " + OTUser.getStrLASTNAME());
    parameters.put("P_H_CLT_INFOS", ("LOTS / PEREMPTIONS " + (designation != null ? designation : "")).toUpperCase());
    parameters.put("P_CIP", cip);
    parameters.put("P_EMPLACEMENT", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
    parameters.put("P_NBRE_MOIS", Integer.valueOf(nbreMois));

    new logger().OCategory.info("rp_lots_peremptions cip:" + cip + " emplacement:" + OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

    OreportManager.BuildReport(parameters, Ojconnexion);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "rp_lots_peremptions_" + report_generate_file);

%>
