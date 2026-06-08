<%@page import="bll.common.Parameter"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TTypeSociete"%>
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
<%@page import="java.math.BigInteger"  %>



<!-- fin logic de gestion des page -->

<%

    dataManager OdataManager = new dataManager();
    date key = new date();
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    String  search_value = "", lg_FAMILLE_ID = "%%", lg_DCI_ID = "", str_TYPE_TRANSACTION = "%%";
    short boolDECONDITIONNE = 0;

    if (request.getParameter("search_value") != null) {
        search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    }

    if (request.getParameter("lg_DCI_ID") != null && !request.getParameter("lg_DCI_ID").equalsIgnoreCase("")) {
        lg_DCI_ID = request.getParameter("lg_DCI_ID");
        new logger().OCategory.info("lg_DCI_ID " + lg_DCI_ID);
    }

    // Filtre stock (operateur + valeur) - meme logique que la fiche article ecran.
    // P_STOCK_CONDITION est un fragment SQL pret a etre injecte dans le report (.jrxml)
    // via $P!{P_STOCK_CONDITION}; vide si le filtre n'est pas (ou mal) renseigne.
    String stock_operator = request.getParameter("stock_operator");
    String stock_value = request.getParameter("stock_value");
    String stock_sql_operator = "";
    Integer stock_number = null;
    if (stock_operator != null) {
        if ("LESS".equals(stock_operator)) {
            stock_sql_operator = "<";
        } else if ("MORE".equals(stock_operator)) {
            stock_sql_operator = ">";
        } else if ("EQUAL".equals(stock_operator)) {
            stock_sql_operator = "=";
        } else if ("LESSOREQUAL".equals(stock_operator)) {
            stock_sql_operator = "<=";
        } else if ("MOREOREQUAL".equals(stock_operator)) {
            stock_sql_operator = ">=";
        }
    }
    if (stock_value != null && !stock_value.trim().equals("")) {
        try {
            stock_number = Integer.valueOf(stock_value.trim());
        } catch (NumberFormatException e) {
            stock_number = null;
        }
    }
    String stock_condition = "";
    if (!stock_sql_operator.equals("") && stock_number != null) {
        stock_condition = " AND int_NUMBER_AVAILABLE " + stock_sql_operator + " " + stock_number + " ";
    }
    new logger().OCategory.info("stock_condition " + stock_condition);

    reportManager OreportManager = new reportManager();
    String scr_report_file = "rp_fiche_article";
    String report_generate_file = key.GetNumberRandom();

    report_generate_file = report_generate_file + ".pdf";

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();

    Map parameters = new HashMap();
    OdataManager.initEntityManager();
    String P_H_TITLE = "Liste des articles";

    if (request.getParameter("str_TYPE_TRANSACTION") != null && !request.getParameter("str_TYPE_TRANSACTION").equals("")) {
        str_TYPE_TRANSACTION = request.getParameter("str_TYPE_TRANSACTION");
        new logger().OCategory.info("str_TYPE_TRANSACTION " + str_TYPE_TRANSACTION);
    }

    if (str_TYPE_TRANSACTION.equalsIgnoreCase("%%") || str_TYPE_TRANSACTION.equalsIgnoreCase("ALL")) {
        if(!lg_DCI_ID.equalsIgnoreCase("")) {
            scr_report_file = "rp_fiche_article_dci";
        }
    } else if (str_TYPE_TRANSACTION.equalsIgnoreCase("SANSEMPLACEMENT")) {
        scr_report_file = "rp_fiche_article_sansemplacement";
        if(!lg_DCI_ID.equalsIgnoreCase("")) {
            scr_report_file = "rp_fiche_article_sansemplacement_dci";
        }
    } else {
        if (str_TYPE_TRANSACTION.equalsIgnoreCase("DECONDITIONNE")) {
            boolDECONDITIONNE = 1;
            P_H_TITLE = "Les articles deconditionnes";           
        } else {
            P_H_TITLE = "Les articles deconditionnables";  
        }
        if(!lg_DCI_ID.equalsIgnoreCase("")) {
            scr_report_file = "rp_fiche_article_dci_decondition";
        } else {
            scr_report_file = "rp_fiche_article_decondition";
        }
    }

    
    new logger().OCategory.info("scr_report_file:" + scr_report_file);
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "fiche_article_" + report_generate_file);

    jconnexion ojconnexion = new jconnexion();
    ojconnexion.initConnexion();
    ojconnexion.OpenConnexion();

    TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");

    parameters.put("P_H_CLT_INFOS", P_H_TITLE.toUpperCase());
    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
    parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + " " + OTUser.getStrLASTNAME());
    parameters.put("P_H_CC_RC", ((oTOfficine.getStrCOMPTECONTRIBUABLE() != null && !oTOfficine.getStrCOMPTECONTRIBUABLE().equalsIgnoreCase("")) ? "CC:" + oTOfficine.getStrCOMPTECONTRIBUABLE() : "") + ((oTOfficine.getStrREGISTRECOMMERCE() != null && !oTOfficine.getStrREGISTRECOMMERCE().equalsIgnoreCase("")) ? " / RC: " + oTOfficine.getStrREGISTRECOMMERCE() : ""));
    parameters.put("P_H_CI_RI", ((oTOfficine.getStrCENTREIMPOSITION() != null && !oTOfficine.getStrCENTREIMPOSITION().equalsIgnoreCase("")) ? "CI:" + oTOfficine.getStrCENTREIMPOSITION() : "") + ((oTOfficine.getStrREGISTREIMPOSITION() != null && !oTOfficine.getStrREGISTREIMPOSITION().equalsIgnoreCase("")) ? " / RI: " + oTOfficine.getStrREGISTREIMPOSITION() : ""));
    parameters.put("P_AUTRE_DESC",  oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                }
            }
            parameters.put("P_H_PHONE", finalphonestring);
          

    parameters.put("P_BOOL_DECONDITION", boolDECONDITIONNE);
    parameters.put("P_REFERENCE", lg_FAMILLE_ID);
    parameters.put("P_EMPLACEMENT", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
    parameters.put("P_SEARCH", search_value + "%");
    // Parametres du filtre stock pour les reports (.jrxml). P_STOCK_CONDITION = fragment SQL
    // injectable via $P!{P_STOCK_CONDITION} (vide => aucun filtre stock).
    parameters.put("P_STOCK_CONDITION", stock_condition);
    parameters.put("P_STOCK_OPERATOR", stock_sql_operator);
    parameters.put("P_STOCK_VALUE", stock_number);
    new logger().OCategory.info("emplacement:" + OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "|boolDECONDITIONNE:"+boolDECONDITIONNE);

    OreportManager.BuildReport(parameters, ojconnexion);

    ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "fiche_article_" + report_generate_file);

%>


