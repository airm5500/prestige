<%@page import="dal.TEmplacement"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TOfficine"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="rest.report.ReserveReportBuilder"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>

<%!
    Translate OTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    TParameters OTParameters;
    bllBase ObllBase = new bllBase();
    TUser OTUser = null;

    /**
     * Mise en forme des numeros de telephone de l'en-tete.
     *
     * La fonction commune de la bibliotheque convertit le numero en nombre : le zero de tete
     * disparait, et son rattrapage ne se declenche pas une fois le numero mis en forme. Un
     * 0594178254 ressortait donc en 5-94-17-82-54. On travaille ici sur le texte, sans jamais le
     * convertir, et on accepte plusieurs numeros separes par ; / ou virgule, comme sur la fiche
     * officine.
     */
    String telephones(String brut) {
        if (brut == null || brut.trim().isEmpty()) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        for (String numero : brut.split("[;/,]")) {
            String chiffres = numero.replaceAll("[^0-9]", "");
            if (chiffres.isEmpty()) {
                continue;
            }
            StringBuilder mis = new StringBuilder();
            for (int i = 0; i < chiffres.length(); i++) {
                if (i > 0 && (chiffres.length() - i) % 2 == 0) {
                    mis.append('-');
                }
                mis.append(chiffres.charAt(i));
            }
            if (out.length() > 0) {
                out.append(" / ");
            }
            out.append(mis);
        }
        return out.length() == 0 ? "" : "(+225) " + out;
    }
%>

<%
    // Generateur PDF unique de la gestion des reserves.
    // Le parametre "mode" choisit le modele Jasper a utiliser :
    //   historique_global        -> tous les mouvements
    //   historique_reserve       -> mouvements ASSORT   (envoi en reserve)
    //   historique_rayon         -> mouvements REASSORT (envoi en rayon)
    //   liste_tout               -> tous les articles suivis en reserve
    //   liste_reappro_reserve    -> articles a envoyer du rayon vers la reserve
    //   liste_reappro_rayon      -> articles a sortir de la reserve vers le rayon

    String mode = request.getParameter("mode");
    if (mode == null || mode.trim().isEmpty()) {
        mode = "liste_tout";
    }
    mode = mode.trim();

    String search = request.getParameter("search");
    String dtStart = request.getParameter("dtStart");
    String dtEnd = request.getParameter("dtEnd");

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    if (OTUser == null) {
        response.sendError(403, "Session expiree");
        return;
    }

    String scr_report_file;
    String P_H_CLT_INFOS;
    String prefixe;
    if ("historique_global".equals(mode)) {
        scr_report_file = "rp_reserve_historique_global";
        P_H_CLT_INFOS = "HISTORIQUE DES MOUVEMENTS DE RESERVE";
        prefixe = "reserve_historique_global_";
    } else if ("historique_reserve".equals(mode)) {
        scr_report_file = "rp_reserve_historique_reserve";
        P_H_CLT_INFOS = "HISTORIQUE - REAPPRO RESERVE (ENVOI EN RESERVE)";
        prefixe = "reserve_historique_reserve_";
    } else if ("historique_rayon".equals(mode)) {
        scr_report_file = "rp_reserve_historique_rayon";
        P_H_CLT_INFOS = "HISTORIQUE - REAPPRO RAYON (ENVOI EN RAYON)";
        prefixe = "reserve_historique_rayon_";
    } else if ("liste_reappro_reserve".equals(mode)) {
        scr_report_file = "rp_reserve_liste_reappro_reserve";
        P_H_CLT_INFOS = "LISTE DES PRODUITS EN REAPPRO RESERVE (ENVOI EN RESERVE)";
        prefixe = "reserve_liste_reappro_reserve_";
    } else if ("liste_reappro_rayon".equals(mode)) {
        scr_report_file = "rp_reserve_liste_reappro_rayon";
        P_H_CLT_INFOS = "LISTE DES PRODUITS EN REAPPRO RAYON (ENVOI EN RAYON)";
        prefixe = "reserve_liste_reappro_rayon_";
    } else {
        scr_report_file = "rp_reserve_liste_tout";
        P_H_CLT_INFOS = "LISTE DES PRODUITS EN RESERVE";
        prefixe = "reserve_liste_tout_";
    }

    new logger().OCategory.info("reserve pdf mode=" + mode + " modele=" + scr_report_file
            + " user=" + OTUser.getLgUSERID());

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    date key = new date();

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();

    String report_generate_file = key.GetNumberRandom() + ".pdf";
    String cheminModele = Ojdom.scr_report_file + scr_report_file + ".jrxml";
    String cheminPdf = Ojdom.scr_report_pdf + prefixe + report_generate_file;

    Map parameters = new HashMap();

    // Filtres. Les bornes de date sont toujours renseignees : le modele n'a ainsi
    // aucun cas nul a gerer et "toutes dates" devient un intervalle tres large.
    parameters.put("P_EMPLACEMENT_ID", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
    parameters.put("P_SEARCH", (search == null || search.trim().isEmpty()) ? "%" : "%" + search.trim() + "%");
    parameters.put("P_DATE_DEBUT", (dtStart == null || dtStart.trim().isEmpty()) ? "1900-01-01" : dtStart.trim());
    parameters.put("P_DATE_FIN", (dtEnd == null || dtEnd.trim().isEmpty()) ? "2999-12-31" : dtEnd.trim());

    // Entete / pied de page : meme construction que la fiche d'inventaire.
    parameters.put("P_H_LOGO", jdom.scr_report_file_logo);
    parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
    parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());

    String P_INSTITUTION_ADRESSE = "";
    if ("1".equals(OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
        TOfficine oTOfficine = obllBase.getOdataManager().getEm().find(dal.TOfficine.class, "1");
        parameters.put("P_H_INSTITUTION", oTOfficine.getStrNOMABREGE());
        parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
        if (oTOfficine.getStrPHONE() != null) {
            P_INSTITUTION_ADRESSE += " Tel: " + telephones(oTOfficine.getStrPHONE());
        }
        if (oTOfficine.getStrADRESSSEPOSTALE() != null) {
            P_INSTITUTION_ADRESSE += " - " + oTOfficine.getStrADRESSSEPOSTALE();
        }
    } else {
        TEmplacement oEm = OTUser.getLgEMPLACEMENTID();
        parameters.put("P_H_INSTITUTION", oEm.getStrDESCRIPTION());
        parameters.put("P_AUTRE_DESC", oEm.getStrFIRSTNAME() + " " + oEm.getStrLASTNAME());
        if (oEm.getStrLOCALITE() != null) {
            P_INSTITUTION_ADRESSE += "Localite: " + oEm.getStrLOCALITE();
        }
        if (oEm.getStrPHONE() != null) {
            P_INSTITUTION_ADRESSE += " - Tel: " + telephones(oEm.getStrPHONE());
        }
    }
    parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);

    // Generation depuis le POOL de l'application : le rapport lit la meme base que l'ecran.
    ReserveReportBuilder.build(cheminModele, cheminPdf, parameters);

    ObllBase.setKey(new date());
    ObllBase.setOTranslate(OTranslate);
    ObllBase.setOTUser(OTUser);

    response.sendRedirect("../../../data/reports/pdf/" + prefixe + report_generate_file);
%>
