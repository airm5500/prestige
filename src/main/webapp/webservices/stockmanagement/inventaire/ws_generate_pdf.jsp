<%@page import="dal.TEmplacement"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TInventaire"%>
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
    Translate OTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    TParameters OTParameters;
    bllBase ObllBase = new bllBase();
    TUser OTUser = null;
%>


<!-- fin logic de gestion des page -->

<%
    String lg_INVENTAIRE_ID = "", str_NAME_FILE = "", lg_USER_ID = "%%", P_ZONE_ID = "", P_FAMILLEARTICLE_ID = "", P_GROSSISTE_ID = "", str_FILTER = "";
    int P_ALERTE = 0;

    if (request.getParameter("lg_INVENTAIRE_ID") != null) {
        lg_INVENTAIRE_ID = request.getParameter("lg_INVENTAIRE_ID");

    }
    if (request.getParameter("lg_USER_ID") != null && !"".equals(request.getParameter("lg_USER_ID"))) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
        new logger().OCategory.info("lg_USER_ID " + lg_USER_ID);
    }
    if (request.getParameter("P_ZONE_ID") != null && !"".equals(request.getParameter("P_ZONE_ID"))) {
        P_ZONE_ID = request.getParameter("P_ZONE_ID");
        new logger().OCategory.info("P_ZONE_ID " + P_ZONE_ID);
    }
    if (request.getParameter("P_GROSSISTE_ID") != null && !"".equals(request.getParameter("P_GROSSISTE_ID"))) {
        P_GROSSISTE_ID = request.getParameter("P_GROSSISTE_ID");
        new logger().OCategory.info("P_GROSSISTE_ID " + P_ZONE_ID);
    }

    if (request.getParameter("P_FAMILLEARTICLE_ID") != null && !"".equals(request.getParameter("P_FAMILLEARTICLE_ID"))) {
        P_FAMILLEARTICLE_ID = request.getParameter("P_FAMILLEARTICLE_ID");

    }

    if (request.getParameter("P_ALERTE") != null) {
        P_ALERTE = Integer.parseInt(request.getParameter("P_ALERTE"));
        new logger().OCategory.info("P_ALERTE " + P_ALERTE);
    }

    if (request.getParameter("str_NAME_FILE") != null) {
        str_NAME_FILE = request.getParameter("str_NAME_FILE");
        new logger().OCategory.info("str_NAME_FILE " + str_NAME_FILE);
    }

    if (request.getParameter("str_FILTER") != null) {
        str_FILTER = request.getParameter("str_FILTER");
        new logger().OCategory.info("str_FILTER " + str_FILTER);
    }

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    jconnexion Ojconnexion = new jconnexion();
    Ojconnexion.initConnexion();
    Ojconnexion.OpenConnexion();
    date key = new date();
    reportManager OreportManager = new reportManager();

    OdataManager.initEntityManager();
    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();
    privilege Oprivilege = new privilege(OdataManager, OTUser);
    TInventaire oTInventaire = obllBase.getOdataManager().getEm().find(dal.TInventaire.class, lg_INVENTAIRE_ID);
    //String scr_report_file = "rp_fiche_inventaire";
    String str_TYPE = oTInventaire.getStrTYPE();
    String P_H_CLT_INFOS = "Fiche d'inventaire";

    if (str_TYPE.equalsIgnoreCase("unitaire")) {
        str_TYPE = "emplacement";
    }
    String scr_report_file = "rp_fiche_inventaire_agent_" + str_TYPE;
    String report_generate_file = key.GetNumberRandom();

    boolean result_show_col_stock = Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.P_SHOW_INVENTAIRE);
    // case 'Afficher stock' de la fiche inventaire : quand le parametre est
    // transmis, il pilote l'affichage du stock a l'impression exactement
    // comme le privilege
    if (request.getParameter("showStock") != null && !"".equals(request.getParameter("showStock"))) {
        result_show_col_stock = Boolean.parseBoolean(request.getParameter("showStock"));
    }
    if (result_show_col_stock) {
        scr_report_file = "rp_fiche_inventaire_" + str_TYPE;
    } else {
        scr_report_file = "rp_fiche_inventaire_agent_" + str_TYPE;
    }

    if (str_NAME_FILE.equalsIgnoreCase("final")) {
        //scr_report_file = "rp_fiche_inventaire_final";
        scr_report_file = "rp_fiche_inventaire_final_" + str_TYPE.toLowerCase();
    } else if (str_NAME_FILE.equalsIgnoreCase("ecart")) {
        // choix du fichier d'impression de jasper ; la case 'Afficher stock'
        // (ou le privilege) pilote la variante avec ou sans stock machine
        String ecartPrefix = result_show_col_stock ? "rp_fiche_inventaire_ecart_" : "rp_fiche_inventaire_ecart_agent_";
        if (str_FILTER.equalsIgnoreCase("manquant") || str_FILTER.equalsIgnoreCase("surplus")) {

            scr_report_file = ecartPrefix + str_FILTER.toLowerCase();
            new logger().OCategory.info("scr_report_file FILTER " + str_FILTER);

        } else {
            scr_report_file = ecartPrefix + str_TYPE.toLowerCase();
        }
        P_H_CLT_INFOS = "Liste des \u00e9carts";

    } else if (str_NAME_FILE.equalsIgnoreCase("alerte")) {
        if (result_show_col_stock) {
            P_H_CLT_INFOS = "Liste des articles alertes";
            scr_report_file = "rp_fiche_inventaire_alerte_" + str_TYPE;
        } else {
            scr_report_file = "rp_fiche_inventaire_agent_alerte_" + str_TYPE;
        }
    }

    new logger().OCategory.info("scr_report_file " + scr_report_file);

    // Nom du fichier produit : libelle de l'inventaire et horodatage, pour qu'un document
    // retrouve sur le poste se rattache sans ambiguite a son inventaire et a son tirage.
    // Le libelle est nettoye de tout ce qui n'a pas sa place dans un nom de fichier.
    String libelleFichier = oTInventaire.getStrNAME() == null ? "" : oTInventaire.getStrNAME();
    libelleFichier = java.text.Normalizer.normalize(libelleFichier, java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").replaceAll("[^A-Za-z0-9]+", "_").replaceAll("^_+|_+$", "");
    if (libelleFichier.length() > 60) {
        libelleFichier = libelleFichier.substring(0, 60);
    }
    String horodatage = new java.text.SimpleDateFormat("ddMMyyyy_HHmmss").format(new java.util.Date());
    String segment = str_NAME_FILE.equalsIgnoreCase("ecart") ? "ecart" : "liste_comptage";
    report_generate_file = libelleFichier + "_" + segment + "_" + horodatage + ".pdf";
    OreportManager.setPath_report_src(Ojdom.scr_report_file + scr_report_file + ".jrxml");
    OreportManager.setPath_report_pdf(Ojdom.scr_report_pdf + "fiche_inventaire_" + report_generate_file);

    // TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
    Paper paper = new Paper();
    PageFormat format = new PageFormat();

    barecodeManager obarecodeManager = new barecodeManager();
    String fileBarecode = obarecodeManager.buildLineBarecode(oTInventaire.getLgINVENTAIREID());
    Map parameters = new HashMap();

    /* parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS.toUpperCase());
    parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
    parameters.put("P_INSTITUTION_ADRESSE", oTOfficine.getStrADRESSSEPOSTALE());
    parameters.put("P_PRINTED_BY", OTUser.getStrFIRSTNAME() + " " + OTUser.getStrLASTNAME());
    parameters.put("P_H_CC_RC", ((oTOfficine.getStrCOMPTECONTRIBUABLE() != null && !oTOfficine.getStrCOMPTECONTRIBUABLE().equalsIgnoreCase("")) ? "CC:" + oTOfficine.getStrCOMPTECONTRIBUABLE() : "") + ((oTOfficine.getStrREGISTRECOMMERCE() != null && !oTOfficine.getStrREGISTRECOMMERCE().equalsIgnoreCase("")) ? " / RC: " + oTOfficine.getStrREGISTRECOMMERCE() : ""));
    parameters.put("P_H_CI_RI", ((oTOfficine.getStrCENTREIMPOSITION() != null && !oTOfficine.getStrCENTREIMPOSITION().equalsIgnoreCase("")) ? "CI:" + oTOfficine.getStrCENTREIMPOSITION() : "") + ((oTOfficine.getStrREGISTREIMPOSITION() != null && !oTOfficine.getStrREGISTREIMPOSITION().equalsIgnoreCase("")) ? " / RI: " + oTOfficine.getStrREGISTREIMPOSITION() : ""));
    parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
    String finalphonestring = oTOfficine.getStrPHONE() != null ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
        for (String va : phone) {
            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
        }
    }
    parameters.put("P_H_PHONE", finalphonestring);*/
    parameters.put("P_REFERENCE", oTInventaire.getLgINVENTAIREID());
    parameters.put("P_USER", lg_USER_ID);
    if (str_NAME_FILE.equalsIgnoreCase("alerte")) {
        parameters.put("P_ALERTE", P_ALERTE);
    }

    parameters.put("P_ZONE_ID", "%" + P_ZONE_ID + "%");
    parameters.put("P_FAMILLEARTICLE_ID", "%" + P_FAMILLEARTICLE_ID + "%");
    parameters.put("P_GROSSISTE_ID", "%" + P_GROSSISTE_ID + "%");

    String P_H_LOGO = jdom.scr_report_file_logo;
    String P_H_CC_P_H_RC = "", P_H_CI_P_H_RI = "", P_H_INSTITUTION = "", P_INSTITUTION_ADRESSE = "";
    String P_FOOTER_RC = "";
    parameters.put("P_H_LOGO", P_H_LOGO);
    if ("1".equals(OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
        TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");

        parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());

        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
        parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

        if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
            P_FOOTER_RC += "RC N\u00b0 " + oTOfficine.getStrREGISTRECOMMERCE();
        }

        if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
            P_FOOTER_RC += " - CC N\u00b0 " + oTOfficine.getStrCOMPTECONTRIBUABLE();
        }
        if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
            P_FOOTER_RC += " - R\u00e9gime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
        }
        if (oTOfficine.getStrCENTREIMPOSITION() != null) {
            P_FOOTER_RC += " - Centre des Imp\u00f4ts: " + oTOfficine.getStrCENTREIMPOSITION();
        }

        if (oTOfficine.getStrPHONE() != null) {
            String finalphonestring = oTOfficine.getStrPHONE() != null ? " Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                }
            }
            P_INSTITUTION_ADRESSE +=  finalphonestring;
        }
        if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
            P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
        }
        if (oTOfficine.getStrNUMCOMPTABLE() != null) {
            P_INSTITUTION_ADRESSE += " - CPT N\u00b0: " + oTOfficine.getStrNUMCOMPTABLE();
        }
        System.out.println("P_INSTITUTION_ADRESSE  ********** "+P_INSTITUTION_ADRESSE);
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);

    } else {
        TEmplacement oEm = OTUser.getLgEMPLACEMENTID();
        parameters.put("P_AUTRE_DESC", oEm.getStrFIRSTNAME() + " " + oEm.getStrLASTNAME());
        P_H_INSTITUTION = oEm.getStrDESCRIPTION();
        // P_INSTITUTION_ADRESSE = oEm.getStrLOCALITE();
        parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

        parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
       

        if (oEm.getStrPHONE() != null) {
            if (oEm.getStrLOCALITE() != null) {
                P_INSTITUTION_ADRESSE += "Localit\u00e9 \u00b0: " + oEm.getStrLOCALITE();
            }
            String finalphonestring = oEm.getStrPHONE() != null ? " Tel: " + conversion.PhoneNumberFormat("+225", oEm.getStrPHONE()) : "";

            P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
        }

        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);

    }
     parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS.toUpperCase());

    OreportManager.BuildReport(parameters, Ojconnexion);

    ObllBase.setKey(new date());
    ObllBase.setOTranslate(OTranslate);
    ObllBase.setOTUser(OTUser);

    Ojconnexion.CloseConnexion();

    response.sendRedirect("../../../data/reports/pdf/" + "fiche_inventaire_" + report_generate_file);

%>


