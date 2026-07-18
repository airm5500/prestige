<%@page import="dal.TEmplacement"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TInventaire"%>
<%@page import="dal.TOfficine"%>
<%@page import="dal.TParameters"%>
<%@page import="bll.utils.TparameterManager"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="dal.jconnexion"%>
<%@page import="report.reportManager"%>
<%@page import="toolkits.utils.logger"%>
<%@page import="dal.dataManager"%>
<%@page import="dal.TUser"%>
<%@page import="bll.bllBase"%>
<%@page import="java.util.*"%>
<%@page import="toolkits.utils.date"%>
<%@page import="bll.userManagement.privilege"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%--
    Impression Jasper de la liste d'inventaire pour le filtre courant
    (tous / manquants / surplus / ecarts / alertes / touches / non touches).
    Modeles : rp_fiche_inventaire_filtre.jrxml (avec stock machine et ecart)
    ou rp_fiche_inventaire_filtre_agent.jrxml (sans), selon le privilege
    d'affichage du stock machine ou la case 'Afficher stock'.
--%>
<%
    String lg_INVENTAIRE_ID = "", str_TYPE = "", search_value = "", lg_USER_ID = "%%",
            P_ZONE_ID = "", P_FAMILLEARTICLE_ID = "", P_GROSSISTE_ID = "";
    int int_ALERTE = 0;

    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");
    }
    if (request.getParameter("str_TYPE") != null) {
        str_TYPE = request.getParameter("str_TYPE");
    }
    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("lg_USER_ID") != null && !"".equals(request.getParameter("lg_USER_ID"))) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
    }
    if (request.getParameter("lg_ZONE_GEO_ID") != null && !"".equals(request.getParameter("lg_ZONE_GEO_ID"))) {
        P_ZONE_ID = request.getParameter("lg_ZONE_GEO_ID");
    }
    if (request.getParameter("lg_FAMILLEARTICLE_ID") != null && !"".equals(request.getParameter("lg_FAMILLEARTICLE_ID"))) {
        P_FAMILLEARTICLE_ID = request.getParameter("lg_FAMILLEARTICLE_ID");
    }
    if (request.getParameter("lg_GROSSISTE_ID") != null && !"".equals(request.getParameter("lg_GROSSISTE_ID"))) {
        P_GROSSISTE_ID = request.getParameter("lg_GROSSISTE_ID");
    }

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    dataManager OdataManager = new dataManager();
    OdataManager.initEntityManager();
    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    TparameterManager OTparameterManager = new TparameterManager(OdataManager);
    TParameters OTParameters = OTparameterManager.getParameter("KEY_MAX_VALUE_INVENTAIRE");
    if (OTParameters != null) {
        int_ALERTE = Integer.parseInt(OTParameters.getStrVALUE());
    }

    // meme regle que ws_generate_pdf.jsp : privilege stock machine,
    // surchargable par la case 'Afficher stock' (parametre showStock)
    boolean result_show_col_stock = Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.P_SHOW_INVENTAIRE);
    if (request.getParameter("showStock") != null && !"".equals(request.getParameter("showStock"))) {
        result_show_col_stock = Boolean.parseBoolean(request.getParameter("showStock"));
    }
    String scr_report_file = result_show_col_stock ? "rp_fiche_inventaire_filtre" : "rp_fiche_inventaire_filtre_agent";

    String libelleFiltre = "Tous les articles";
    if ("MANQUANT".equalsIgnoreCase(str_TYPE)) {
        libelleFiltre = "Articles manquants";
    } else if ("SURPLUS".equalsIgnoreCase(str_TYPE)) {
        libelleFiltre = "Articles surplus";
    } else if ("MANQUANTSURPLUS".equalsIgnoreCase(str_TYPE)) {
        libelleFiltre = "Tous les \u00e9carts";
    } else if ("ALERTE".equalsIgnoreCase(str_TYPE)) {
        libelleFiltre = "Articles alertes";
    } else if ("TOUCHE".equalsIgnoreCase(str_TYPE)) {
        libelleFiltre = "Articles touch\u00e9s";
    } else if ("NONTOUCHE".equalsIgnoreCase(str_TYPE)) {
        libelleFiltre = "Articles non touch\u00e9s";
    }

    String report_generate_file = key.GetNumberRandom() + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "fiche_inventaire_filtre_" + report_generate_file);

    Map parameters = new HashMap();
    parameters.put("P_REFERENCE", lg_INVENTAIRE_ID);
    parameters.put("P_FILTRE", str_TYPE == null ? "" : str_TYPE);
    parameters.put("P_FILTRE_LIBELLE", libelleFiltre);
    parameters.put("P_SEARCH", "%" + search_value + "%");
    parameters.put("P_ZONE_ID", "%" + P_ZONE_ID + "%");
    parameters.put("P_FAMILLEARTICLE_ID", "%" + P_FAMILLEARTICLE_ID + "%");
    parameters.put("P_GROSSISTE_ID", "%" + P_GROSSISTE_ID + "%");
    parameters.put("P_USER", lg_USER_ID);
    parameters.put("P_ALERTE", Integer.valueOf(int_ALERTE));
    parameters.put("P_H_CLT_INFOS", "LISTE D'INVENTAIRE");

    String P_INSTITUTION_ADRESSE = "", P_FOOTER_RC = "";
    if ("1".equals(OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
        TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
        parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
            P_FOOTER_RC += "RC N\u00b0 " + oTOfficine.getStrREGISTRECOMMERCE();
        }
        if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
            P_FOOTER_RC += " - CC N\u00b0 " + oTOfficine.getStrCOMPTECONTRIBUABLE();
        }
        if (oTOfficine.getStrPHONE() != null) {
            P_INSTITUTION_ADRESSE += " Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE());
        }
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    } else {
        TEmplacement oEm = OTUser.getLgEMPLACEMENTID();
        parameters.put("P_H_INSTITUTION", oEm.getStrDESCRIPTION());
        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        if (oEm.getStrLOCALITE() != null) {
            P_INSTITUTION_ADRESSE += "Localit\u00e9 : " + oEm.getStrLOCALITE();
        }
        if (oEm.getStrPHONE() != null) {
            P_INSTITUTION_ADRESSE += " - Tel: " + conversion.PhoneNumberFormat("+225", oEm.getStrPHONE());
        }
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);
    }

    OreportManager.BuildReport(parameters, Ojconnexion);
    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "fiche_inventaire_filtre_" + report_generate_file);
%>
