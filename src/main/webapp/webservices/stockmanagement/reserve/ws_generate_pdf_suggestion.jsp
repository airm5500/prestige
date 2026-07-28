<%@page import="dal.TEmplacement"%>
<%@page import="dal.TSuggestionReserve"%>
<%@page import="toolkits.utils.conversion"%>
<%@page import="dal.TOfficine"%>
<%@page import="dal.TParameters"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="rest.report.ReserveReportBuilder"%>
<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.text.SimpleDateFormat"  %>
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

    String nomUtilisateur(TUser u) {
        if (u == null) {
            return "-";
        }
        String prenom = u.getStrFIRSTNAME() == null ? "" : u.getStrFIRSTNAME();
        String nom = u.getStrLASTNAME() == null ? "" : u.getStrLASTNAME();
        String complet = (prenom + " " + nom).trim();
        return complet.isEmpty() ? (u.getStrLOGIN() == null ? "-" : u.getStrLOGIN()) : complet;
    }


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

    String dateTexte(Date d) {
        return d == null ? "-" : new SimpleDateFormat("dd/MM/yyyy HH:mm").format(d);
    }
%>

<%
    // Impression d'une suggestion de reserve.
    //   mode=suggestion    -> la suggestion elle-meme (modele choisi selon le sens du mouvement)
    //   mode=compte_rendu  -> le compte rendu detaille du traitement
    //
    // L'identite de la suggestion (reference, statut, motif, dates, createur, cloturant) est
    // transmise en parametres plutot que lue par la requete du modele : l'en-tete reste ainsi
    // complet meme si la suggestion ne contient aucune ligne.

    String mode = request.getParameter("mode");
    if (mode == null || mode.trim().isEmpty()) {
        mode = "suggestion";
    }
    mode = mode.trim();
    String suggestionId = request.getParameter("id");
    if (suggestionId == null || suggestionId.trim().isEmpty()) {
        response.sendError(400, "Identifiant de suggestion manquant");
        return;
    }
    suggestionId = suggestionId.trim();

    OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    if (OTUser == null) {
        response.sendError(403, "Session expiree");
        return;
    }

    bllBase obllBase = new bllBase();
    obllBase.checkDatamanager();
    TSuggestionReserve suggestion = obllBase.getOdataManager().getEm()
            .find(dal.TSuggestionReserve.class, suggestionId);
    if (suggestion == null) {
        response.sendError(404, "Suggestion introuvable");
        return;
    }

    boolean versReserve = TSuggestionReserve.CATEGORIE_RESERVE.equals(suggestion.getStrCATEGORIE());
    String sens = versReserve
            ? "RAYON -> RESERVE (on range le trop-plein du rayon)"
            : "RESERVE -> RAYON (on regarnit le rayon)";

    String scr_report_file;
    String P_H_CLT_INFOS;
    String prefixe;
    if ("compte_rendu".equals(mode)) {
        scr_report_file = "rp_suggestion_reserve_compte_rendu";
        P_H_CLT_INFOS = "COMPTE RENDU DE TRAITEMENT";
        prefixe = "suggestion_compte_rendu_";
    } else if (versReserve) {
        scr_report_file = "rp_suggestion_reserve_reserve";
        P_H_CLT_INFOS = "SUGGESTION REAPPRO RESERVE";
        prefixe = "suggestion_reappro_reserve_";
    } else {
        scr_report_file = "rp_suggestion_reserve_rayon";
        P_H_CLT_INFOS = "SUGGESTION REAPPRO RAYON";
        prefixe = "suggestion_reappro_rayon_";
    }

    new logger().OCategory.info("suggestion pdf mode=" + mode + " modele=" + scr_report_file
            + " suggestion=" + suggestionId + " user=" + OTUser.getLgUSERID());

    jdom Ojdom = new jdom();
    Ojdom.InitRessource();
    Ojdom.LoadRessource();
    date key = new date();

    String report_generate_file = key.GetNumberRandom() + ".pdf";
    String cheminModele = Ojdom.scr_report_file + scr_report_file + ".jrxml";
    String cheminPdf = Ojdom.scr_report_pdf + prefixe + report_generate_file;

    Map parameters = new HashMap();
    parameters.put("P_SUGGESTION_ID", suggestionId);
    parameters.put("P_REF", suggestion.getStrREF() == null ? "" : suggestion.getStrREF());
    parameters.put("P_SENS", sens);
    parameters.put("P_STATUT", suggestion.getStrSTATUT() == null ? "" : suggestion.getStrSTATUT());
    parameters.put("P_MOTIF", suggestion.getMotif() != null ? suggestion.getMotif().getLibelle() : "-");
    parameters.put("P_CREATEUR", nomUtilisateur(suggestion.getLgUSERCREATEURID()));
    parameters.put("P_CLOTURANT", nomUtilisateur(suggestion.getLgUSERCLOTUREID()));
    // Le controle atteste que le deplacement a bien ete fait dans les rayons : le compte rendu
    // imprime doit le porter, sans quoi rien ne distingue une operation verifiee d'une autre.
    parameters.put("P_CONTROLE", suggestion.getDtCONTROLE() != null
            ? "Controlee le " + dateTexte(suggestion.getDtCONTROLE()) + " par "
                    + nomUtilisateur(suggestion.getLgUSERCONTROLEID())
                    + (suggestion.getStrOBSERVATIONCONTROLE() != null
                            && !suggestion.getStrOBSERVATIONCONTROLE().trim().isEmpty()
                                    ? "  -  " + suggestion.getStrOBSERVATIONCONTROLE() : "")
            : "Non controlee");
    // Dates et validateur sur UNE SEULE ligne : creation, traitement, cloture et la personne
    // qui a valide se lisent d'un coup, au lieu d'etre eparpilles sur deux lignes.
    parameters.put("P_DATES", "Creee le " + dateTexte(suggestion.getDtCREATED())
            + "     Traitee le " + dateTexte(suggestion.getDtTRAITEE())
            + "     Cloturee le " + dateTexte(suggestion.getDtCLOTURE())
            + "     Validee par : " + nomUtilisateur(suggestion.getLgUSERCLOTUREID()));

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
