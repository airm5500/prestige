package rest;

import bll.bllBase;
import bll.common.Parameter;
import bll.configManagement.grossisteManagement;
import bll.entity.EntityData;
import bll.report.StatisticsFamilleArticle;
import bll.facture.factureManagement;
import bll.facture.reglementManager;
import bll.teller.tellerManagement;
import bll.tierspayantManagement.tierspayantManagement;
import bll.userManagement.privilege;
import dal.TClient;
import dal.TDossierReglement;
import dal.TFactureDetail;
import dal.TGrossiste;
import dal.TModeReglement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TTypeFacture;
import dal.TTypeReglement;
import dal.TTypeTiersPayant;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.jdom;

/**
 * Migration REST des webservices JSP du reglement des factures tiers payant
 * (webservices/sm_user/reglement/ws_data_reglement_by_bordereau.jsp, ws_transaction.jsp mode doReglement,
 * ws_mode_reglemnt.jsp, webservices/sm_user/modereglement/ws_data.jsp,
 * webservices/configmanagement/groupe/ws_reglement.jsp).
 *
 * Toutes les operations deleguent aux MEMES methodes metier bll.facture.reglementManager / bll.teller.tellerManagement
 * que les JSP historiques : memes regles, memes messages, memes cles JSON. Chemin distinct de v1/reglement (deja
 * utilise par ReglementRessource pour les reglements differes).
 */
@Path("v1/reglement-facture")
@Produces("application/json")
@Consumes("application/json")
public class ReglementFactureRessource {

    private static final Logger LOG = Logger.getLogger(ReglementFactureRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    /** Edition des etats embarques : le recapitulatif est desormais imprime depuis l'application. */
    @javax.ejb.EJB
    private rest.report.ReportUtil reportUtil;

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response reponseDeconnecte() {
        return Response.ok()
                .entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                        .put("errors", util.Constant.DECONNECTED_MESSAGE).put("total", 0)
                        .put("results", new JSONArray()).toString())
                .build();
    }

    /**
     * Traduit une exception technique en message comprehensible pour l'utilisateur, et transmet l'incident au Centre de
     * Support avec la cause exacte (meme mecanisme que dal.dataManager). Best-effort : ne perturbe jamais la reponse.
     */
    private static String signalerAuSupport(String opration, Exception e) {
        String causeTechnique = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
        if (e.getCause() != null && e.getCause().getMessage() != null) {
            causeTechnique = e.getCause().getMessage();
        }
        String causeSimple;
        String causeMin = causeTechnique.toLowerCase();
        // Troncature MySQL (code 1406) : une valeur depasse la taille prevue en base. Le message
        // technique nomme le champ ; sans ce cas, l'utilisateur recevait la phrase brute de MySQL,
        // en anglais et incomprehensible. Teste sur TOUTE la chaine d'exceptions : JPA emboite la
        // vraie erreur SQL plusieurs niveaux plus bas.
        String champTronque = champTropLong(texteDeLaChaine(e));
        if (champTronque != null) {
            causeSimple = "la valeur du champ « " + champTronque + " » dépasse la taille prévue en base pour ce"
                    + " traitement. Corrigez ce champ sur la ou les fiches concernées (il est plus long que ce que la"
                    + " base autorise), puis relancez l'opération.";
        } else if (causeMin.contains("unknown column")) {
            causeSimple = "la base de données n'est pas à jour (colonne manquante). Les mises à jour de la base "
                    + "(migrations) doivent être exécutées.";
        } else if (causeMin.contains("doesn't exist") || causeMin.contains("table")) {
            causeSimple = "la base de données n'est pas à jour (table manquante). Les mises à jour de la base "
                    + "(migrations) doivent être exécutées.";
        } else if (causeMin.contains("timeout") || causeMin.contains("connection") || causeMin.contains("connexion")) {
            causeSimple = "la base de données ne répond pas. Réessayez dans un instant ; si le problème persiste, "
                    + "le serveur doit être vérifié.";
        } else if (causeMin.contains("unparseable date") || causeMin.contains("parse")) {
            causeSimple = "une date reçue est invalide. Vérifiez les dates saisies à l'écran.";
        } else if (e instanceof NullPointerException) {
            causeSimple = "une donnée attendue est absente (dossier ou facture introuvable).";
        } else {
            causeSimple = causeTechnique;
        }
        try {
            StringBuilder pile = new StringBuilder();
            for (StackTraceElement frame : e.getStackTrace()) {
                pile.append(frame).append('\n');
            }
            rest.service.SupportEventService support = javax.enterprise.inject.spi.CDI.current()
                    .select(rest.service.SupportEventService.class).get();
            rest.service.dto.SupportEventDTO dto = new rest.service.dto.SupportEventDTO();
            dto.setType("JAVA");
            dto.setNiveau("ERROR");
            dto.setModule("REGLEMENT FACTURE");
            dto.setMessageCourt("Echec " + opration + " : " + causeTechnique);
            dto.setUrlOuEcran("api/v1/reglement-facture");
            dto.setPayloadJson("Explication utilisateur : " + causeSimple);
            dto.setStack(pile.length() > 20000 ? pile.substring(0, 20000) : pile.toString());
            support.record(dto, "");
        } catch (RuntimeException ex) {
            // centre de support indisponible : la trace serveur reste
        }
        return causeSimple;
    }

    /**
     * Concatene les messages de toute la chaine d'exceptions.
     *
     * Une erreur SQL remonte emballee : PersistenceException -> DatabaseException -> MysqlDataTruncation. Ne regarder
     * que le premier niveau ferait manquer la vraie cause.
     */
    static String texteDeLaChaine(Throwable e) {
        StringBuilder texte = new StringBuilder();
        Throwable courante = e;
        int garde = 0;
        while (courante != null && garde++ < 20) {
            if (courante.getMessage() != null) {
                texte.append(courante.getMessage()).append(' ');
            }
            courante = courante.getCause() != courante ? courante.getCause() : null;
        }
        return texte.toString();
    }

    /** Nom du champ cite par MySQL dans "Data too long for column 'X'", ou null si l'erreur est d'une autre nature. */
    static String champTropLong(String message) {
        String repere = "Data too long for column '";
        int debut = StringUtils.indexOf(message, repere);
        if (debut < 0) {
            return null;
        }
        debut += repere.length();
        int fin = StringUtils.indexOf(message, "'", debut);
        return fin > debut ? message.substring(debut, fin) : null;
    }

    /** Reproduit la "logic de gestion des page" des JSP historiques : start -> numero de page. */
    private static int pageDepuisStart(String action, String startParam, int dataPerPage) {
        int pageAsInt = 0;
        try {
            if (!"filltable".equals(action)) {
                if (startParam != null) {
                    pageAsInt = (Integer.parseInt(startParam) / dataPerPage) + 1;
                } else {
                    pageAsInt = 1;
                }
            }
        } catch (Exception e) {
        }
        return pageAsInt;
    }

    /** Detail des dossiers d'une facture pour le reglement : MEME logique que ws_data_reglement_by_bordereau.jsp. */
    @GET
    @Path("details-bordereau")
    public Response detailsBordereau(
            @DefaultValue("") @QueryParam("lg_dossier_reglement_id") String lgDossierReglementId,
            @DefaultValue("") @QueryParam("lg_FACTURE_ID") String lgFactureId,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            reglementManager orm = new reglementManager(odm, null);
            List<TFactureDetail> lstTFactureDetail = orm.getDetailsFactureByTiersPayant(lgFactureId);

            int dataPerPage = 5;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);
            if (dataPerPage > lstTFactureDetail.size()) {
                dataPerPage = lstTFactureDetail.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (lstTFactureDetail.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }

            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                JSONObject json = new JSONObject();
                double amount = 0d, dblMONTANTPAYE = 0d, dblMONTANTRESTANT = 0d;
                TPreenregistrementCompteClientTiersPayent preregistrement = orm
                        .getOPreenregistrementCompteClientTiersPayentByRef(lstTFactureDetail.get(i).getStrREF());
                json.put("lg_FACTURE_ID", lstTFactureDetail.get(i).getLgFACTUREID().getStrCODEFACTURE());
                json.put("lg_FACTURE_DETAIL_ID", lstTFactureDetail.get(i).getLgFACTUREDETAILID());
                if (lstTFactureDetail.get(i).getDblMONTANT() != null) {
                    amount = lstTFactureDetail.get(i).getDblMONTANT();
                }
                json.put("Amount", amount);
                if (lstTFactureDetail.get(i).getDblMONTANTPAYE() != null) {
                    dblMONTANTPAYE = lstTFactureDetail.get(i).getDblMONTANTPAYE();
                }
                json.put("dbl_MONTANT_PAYE", dblMONTANTPAYE);
                if (lstTFactureDetail.get(i).getDblMONTANTRESTANT() != null) {
                    dblMONTANTRESTANT = lstTFactureDetail.get(i).getDblMONTANTRESTANT();
                }
                json.put("dbl_MONTANT_RESTANT", dblMONTANTRESTANT);
                json.put("isChecked", false);
                json.put("str_REF", (preregistrement.getStrREFBON() != null ? preregistrement.getStrREFBON() : ""));
                json.put("CLIENT_FULL_NAME", preregistrement.getLgPREENREGISTREMENTID().getStrFIRSTNAMECUSTOMER() + " "
                        + preregistrement.getLgPREENREGISTREMENTID().getStrLASTNAMECUSTOMER());
                json.put("CLIENT_MATRICULE", preregistrement.getLgPREENREGISTREMENTID().getStrNUMEROSECURITESOCIAL());
                json.put("dt_DATE",
                        date.backabaseUiFormat2.format(preregistrement.getLgPREENREGISTREMENTID().getDtUPDATED()));
                json.put("dt_HEURE",
                        date.NomadicUiFormatTime.format(preregistrement.getLgPREENREGISTREMENTID().getDtUPDATED()));
                json.put("int_NB_DOSSIER_RESTANT", lstTFactureDetail.size());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lstTFactureDetail.size() + "\",\"Amount_total\":\"0.0\",\"results\":"
                    + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "details bordereau reglement", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Reglement d'une facture tiers payant : MEME logique que ws_transaction.jsp mode doReglement. */
    @POST
    @Path("do-reglement")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response doReglement(@DefaultValue("") @FormParam("lg_FACTURE_ID") String lgFactureId,
            @DefaultValue("") @FormParam("str_CUSTOMER") String strCustomer,
            @DefaultValue("") @FormParam("MODE_REGLEMENT") String modeReglement,
            @DefaultValue("") @FormParam("TYPE_REGLEMENT") String typeReglement,
            @DefaultValue("") @FormParam("lg_NATURE_PAIEMENT") String lgNaturePaiement,
            @DefaultValue("") @FormParam("str_LIEU") String strLieu,
            @DefaultValue("") @FormParam("str_CODE_MONNAIE") String strCodeMonnaie,
            @DefaultValue("") @FormParam("str_BANQUE") String strBanque,
            @DefaultValue("") @FormParam("str_NOM") String strNom,
            @DefaultValue("0") @FormParam("NET_A_PAYER") double netAPayer,
            @DefaultValue("0") @FormParam("int_TAUX_CHANGE") String tauxChangeParam,
            @DefaultValue("0") @FormParam("int_AMOUNT_REMIS") double amountRemis,
            @DefaultValue("0") @FormParam("int_AMOUNT_RECU") double amountRecu,
            @DefaultValue("") @FormParam("LISTDOSSIERS") String listDossiersParam,
            @DefaultValue("") @FormParam("checkedList") String checkedListParam,
            @DefaultValue("") @FormParam("dt_reglement") String dtReglementParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        bllBase obllBase = new bllBase();
        String lgDossierReglementId = "";
        try {
            odm.initEntityManager();
            Date dtReglement = new Date();
            if (StringUtils.isNotEmpty(dtReglementParam)) {
                String now = dtReglementParam + " " + date.NomadicUiFormatTime.format(new Date());
                dtReglement = date.formatterMysql2.parse(now);
            }
            Integer tauxChange = 0;
            if (StringUtils.isNotEmpty(tauxChangeParam)) {
                tauxChange = Integer.parseInt(tauxChangeParam);
            }
            JSONArray listFactureDetails = new JSONArray();
            if (StringUtils.isNotEmpty(listDossiersParam)) {
                listFactureDetails = new JSONArray(listDossiersParam);
            }
            JSONArray uncheckedlist = new JSONArray();
            if (StringUtils.isNotEmpty(checkedListParam)) {
                uncheckedlist = new JSONArray(checkedListParam);
            }
            reglementManager orm = new reglementManager(odm, sessionUser);
            double finalamout = netAPayer <= amountRecu ? netAPayer : amountRecu;
            TDossierReglement oDossierReglement = orm.makeInvoicePayment(lgFactureId, lgNaturePaiement, strBanque,
                    strLieu, strCodeMonnaie, strLieu, modeReglement, tauxChange, finalamout, amountRemis, amountRecu,
                    listFactureDetails, strNom, strCustomer, uncheckedlist, dtReglement);
            if (oDossierReglement != null) {
                lgDossierReglementId = oDossierReglement.getLgDOSSIERREGLEMENTID();
                orm.updateSnapshotVenteSociete(lgDossierReglementId, lgFactureId);
            }
            obllBase.setMessage(orm.getMessage());
            obllBase.setDetailmessage(orm.getDetailmessage());

            // errors vide quand le reglement a abouti : la JSP historique y mettait le code retour
            // interne ("1" = succes), ce qui pretait a confusion cote utilisateur
            String erreurs = "1".equals(obllBase.getDetailmessage()) ? "" : obllBase.getMessage();
            String result = "{\"success\":\"" + obllBase.getDetailmessage() + "\",\"str_ref\":\"" + lgFactureId
                    + "\",\"lg_DOSSIER_REGLEMENT_ID\":\"" + lgDossierReglementId + "\", \"errors\": \"" + erreurs
                    + "\"}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "do reglement", e);
            // incident transmis au Centre de Support, cause expliquee en langage simple a l'utilisateur
            String causeSimple = signalerAuSupport("du règlement de la facture " + lgFactureId, e);
            return Response
                    .ok().entity(
                            new JSONObject().put("success", commonparameter.PROCESS_FAILED).put("str_ref", lgFactureId)
                                    .put("lg_DOSSIER_REGLEMENT_ID", "")
                                    .put("errors",
                                            "Le règlement n'a pas pu être enregistré : " + causeSimple
                                                    + " L'incident a été transmis au Centre de Support.")
                                    .toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Reglement d'une facture de groupe : MEME logique que configmanagement/groupe/ws_reglement.jsp. */
    @POST
    @Path("groupe")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response reglementGroupe(@DefaultValue("") @FormParam("CODEFACTURE") String codeFacture,
            @DefaultValue("") @FormParam("MODE_REGLEMENT") String modeReglement,
            @DefaultValue("") @FormParam("str_LIEU") String strLieu,
            @DefaultValue("") @FormParam("str_CODE_MONNAIE") String strCodeMonnaie,
            @DefaultValue("") @FormParam("str_BANQUE") String strBanque,
            @DefaultValue("") @FormParam("str_NOM") String strNom,
            @DefaultValue("0") @FormParam("NET_A_PAYER") double netAPayer,
            @DefaultValue("0") @FormParam("int_TAUX_CHANGE") String tauxChangeParam,
            @DefaultValue("0") @FormParam("int_AMOUNT_RECU") double amountRecu,
            @DefaultValue("") @FormParam("LISTDOSSIERS") String listDossiersParam,
            @DefaultValue("") @FormParam("checkedList") String checkedListParam,
            @DefaultValue("0") @FormParam("mode") int mode,
            @DefaultValue("") @FormParam("dt_reglement") String dtReglementParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            Date dtReglement = new Date();
            if (StringUtils.isNotEmpty(dtReglementParam)) {
                String now = dtReglementParam + " " + date.NomadicUiFormatTime.format(new Date());
                dtReglement = date.formatterMysql2.parse(now);
            }
            Integer tauxChange = 0;
            if (StringUtils.isNotEmpty(tauxChangeParam)) {
                tauxChange = Integer.parseInt(tauxChangeParam);
            }
            JSONArray listFactureDetails = new JSONArray();
            if (StringUtils.isNotEmpty(listDossiersParam)) {
                listFactureDetails = new JSONArray(listDossiersParam);
            }
            JSONArray uncheckedlist = new JSONArray();
            if (StringUtils.isNotEmpty(checkedListParam)) {
                uncheckedlist = new JSONArray(checkedListParam);
            }
            reglementManager orm = new reglementManager(odm, user);
            JSONObject data = orm.makeGroupInvoicePayment(codeFacture, -1, strBanque, strLieu, strCodeMonnaie, strLieu,
                    modeReglement, tauxChange, netAPayer, 0, amountRecu, listFactureDetails, strNom, uncheckedlist,
                    dtReglement, mode);
            return Response.ok().entity(data.toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglement groupe", e);
            // incident transmis au Centre de Support, cause expliquee en langage simple a l'utilisateur
            String causeSimple = signalerAuSupport("du règlement de la facture de groupe " + codeFacture, e);
            return Response
                    .ok().entity(
                            new JSONObject().put("success", "0")
                                    .put("errors",
                                            "Le règlement n'a pas pu être enregistré : " + causeSimple
                                                    + " L'incident a été transmis au Centre de Support.")
                                    .toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Liste des modes de reglement : MEME logique que modereglement/ws_data.jsp. */
    @GET
    @Path("modes-reglement")
    public Response modesReglement(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("lg_MODE_REGLEMENT_ID") String lgModeReglementId,
            @DefaultValue("") @QueryParam("lg_TYPE_REGLEMENT_ID") String lgTypeReglementId,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        dataManager odm = new dataManager();
        try {
            String search = StringUtils.isNotEmpty(query) ? query : searchValue;
            String modeId = StringUtils.isNotEmpty(lgModeReglementId) ? lgModeReglementId : "%%";
            String typeId = StringUtils.isNotEmpty(lgTypeReglementId) ? lgTypeReglementId : "%%";
            odm.initEntityManager();
            tellerManagement otm = new tellerManagement(odm);
            List<TModeReglement> lst = otm.getListeTModeReglement(search, modeId, typeId);

            int dataPerPage = jdom.int_size_pagination;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);
            if (dataPerPage > lst.size()) {
                dataPerPage = lst.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (lst.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }
            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                JSONObject json = new JSONObject();
                json.put("lg_MODE_REGLEMENT_ID", lst.get(i).getLgMODEREGLEMENTID());
                json.put("str_NAME", lst.get(i).getStrNAME());
                json.put("str_DESCRIPTION", lst.get(i).getStrDESCRIPTION());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lst.size() + "\",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "modes reglement", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Liste des types de reglement : MEME logique que reglement/ws_mode_reglemnt.jsp. */
    @GET
    @Path("types-reglement")
    public Response typesReglement(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("str_FLAG") String strFlag,
            @DefaultValue("") @QueryParam("lg_TYPE_REGLEMENT_ID") String lgTypeReglementId,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        TUser sessionUser = utilisateurSession();
        dataManager odm = new dataManager();
        try {
            String search = StringUtils.isNotEmpty(query) ? query : searchValue;
            String flag = StringUtils.isNotEmpty(strFlag) ? strFlag : "%%";
            String typeId = StringUtils.isNotEmpty(lgTypeReglementId) ? lgTypeReglementId : "%%";
            odm.initEntityManager();
            reglementManager orm = new reglementManager(odm, sessionUser);
            List<TTypeReglement> lst = orm.getListeTTypeReglement(search, typeId, flag);

            int dataPerPage = jdom.int_size_pagination;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);
            if (dataPerPage > lst.size()) {
                dataPerPage = lst.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (lst.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }
            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                try {
                    odm.getEm().refresh(lst.get(i));
                } catch (Exception er) {
                }
                JSONObject json = new JSONObject();
                json.put("lg_TYPE_REGLEMENT_ID", lst.get(i).getLgTYPEREGLEMENTID());
                json.put("str_NAME", lst.get(i).getStrNAME());
                json.put("str_DESCRIPTION", lst.get(i).getStrDESCRIPTION());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lst.size() + "\",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "types reglement", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Liste des reglements : MEME logique que reglement/ws_data.jsp. */
    @GET
    @Path("list")
    public Response list(@DefaultValue("") @QueryParam("dt_debut") String dtDebutParam,
            @DefaultValue("") @QueryParam("dt_fin") String dtFinParam,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtDebut = StringUtils.isNotEmpty(dtDebutParam) ? dtDebutParam
                    : date.formatterMysqlShort.format(new Date());
            String dtFin = StringUtils.isNotEmpty(dtFinParam) ? dtFinParam + " 23:59:59"
                    : date.formatterMysql.format(new Date());
            String search = "%%";
            if (StringUtils.isNotEmpty(searchValue)) {
                search = searchValue;
            }
            if (StringUtils.isNotEmpty(query)) {
                search = query;
            }
            String tiersPayantId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";
            odm.initEntityManager();
            reglementManager orm = new reglementManager(odm, sessionUser);
            List<EntityData> entityDatas = orm.getAllDossierReglements(tiersPayantId, search, dtDebut, dtFin);

            int dataPerPage = jdom.int_size_pagination;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);
            if (dataPerPage > entityDatas.size()) {
                dataPerPage = entityDatas.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (entityDatas.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }
            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                JSONObject json = new JSONObject();
                json.put("lg_DOSSIER_REGLEMENT_ID", entityDatas.get(i).getStr_value1());
                json.put("str_MODE_REGLEMENT", entityDatas.get(i).getStr_value3());
                json.put("str_MONTANT", entityDatas.get(i).getStr_value2());
                json.put("dt_DATE_REGLEMENT", entityDatas.get(i).getStr_value6());
                json.put("str_ORGANISME", entityDatas.get(i).getStr_value4());
                json.put("LIBELLE_TYPE_TIERS_PAYANT", entityDatas.get(i).getStr_value8());
                json.put("HEURE_REGLEMENT", entityDatas.get(i).getStr_value7());
                json.put("OPERATEUR", entityDatas.get(i).getStr_value5());
                json.put("MONTANT_ATT", entityDatas.get(i).getStr_value10());
                json.put("CODE_FACTURE", entityDatas.get(i).getStr_value9());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + entityDatas.size() + "\",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste reglements", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Details d'un reglement : MEME logique que reglement/ws_details_reglement.jsp. */
    @GET
    @Path("details")
    public Response details(@DefaultValue("") @QueryParam("lg_DOSSIER_REGLEMENT_ID") String lgDossierReglementId,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            reglementManager orm = new reglementManager(odm, null);
            List<EntityData> listEntityData = orm.getAllDossierReglementDetails(lgDossierReglementId, searchValue);

            int dataPerPage = 10;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);
            if (dataPerPage > listEntityData.size()) {
                dataPerPage = listEntityData.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (listEntityData.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }
            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                JSONObject json = new JSONObject();
                json.put("lg_DOSSIER_REGLEMENT_DETAIL_ID", listEntityData.get(i).getStr_value1());
                json.put("Amount", listEntityData.get(i).getStr_value3());
                json.put("str_REF",
                        (listEntityData.get(i).getStr_value2() != null ? listEntityData.get(i).getStr_value2() : ""));
                json.put("CLIENT_FULL_NAME", listEntityData.get(i).getStr_value4());
                json.put("CLIENT_MATRICULE", listEntityData.get(i).getStr_value5());
                json.put("int_NB_DOSSIER_RESTANT", listEntityData.size());
                json.put("dt_DATE", listEntityData.get(i).getStr_value6());
                json.put("dt_HEURE", listEntityData.get(i).getStr_value7());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + listEntityData.size() + "\",\"Amount_total\":\"0.0\",\"results\":"
                    + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "details reglement", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Recapitulatif par compte d'organisme : port de webservices/sm_user/RecapOrganisme/ws_data.jsp, MEME methode
     * metier bll.report.StatisticsFamilleArticle.getRecapReglementByOrganismeData, memes cles JSON. Relogee dans cette
     * classe (au lieu d'une ressource autonome) : sur certains environnements la ressource dediee n'etait pas
     * enregistree par le serveur (404).
     */
    @GET
    @Path("recap-organisme/list")
    public Response recapOrganisme(@DefaultValue("") @QueryParam("dt_start_vente") String dtStartParam,
            @DefaultValue("") @QueryParam("dt_end_vente") String dtEndParam,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query, @DefaultValue("") @QueryParam("action") String action,
            @DefaultValue("") @QueryParam("operateurMontant") String operateurMontant,
            @DefaultValue("") @QueryParam("valeurMontant") String valeurMontant,
            @DefaultValue("") @QueryParam("typeTiersPayant") String typeTiersPayant,
            @DefaultValue("") @QueryParam("groupeTiersPayant") String groupeTiersPayant,
            @QueryParam("start") String startParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam
                    : date.formatterMysqlShort.format(new Date());
            String tiersPayantId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";
            String search = "%%";
            if (StringUtils.isNotEmpty(searchValue)) {
                search = searchValue;
            }
            if (StringUtils.isNotEmpty(query)) {
                search = query;
            }
            odm.initEntityManager();
            StatisticsFamilleArticle familleArticle = new StatisticsFamilleArticle(odm);
            // Les criteres de montant, de type et de groupe (point 10) sont appliques ICI, avant la
            // pagination : filtrer la seule page affichee donnerait des pages inegales et un total
            // faux. La procedure stockee n'est pas retouchee pour autant.
            List<rest.service.filtre.LigneRecapOrganisme> lstdetails = new rest.service.filtre.FiltresRecapOrganisme(
                    operateurMontant, valeurMontant, typeTiersPayant, groupeTiersPayant).appliquer(
                            lignesRecapOrganisme(odm, familleArticle, dtStart, dtEnd, tiersPayantId, search));

            int dataPerPage = 20;
            int pageAsInt = 0;
            try {
                if (!"filltable".equals(action)) {
                    if (startParam != null) {
                        pageAsInt = (Integer.parseInt(startParam) / dataPerPage) + 1;
                    } else {
                        pageAsInt = 1;
                    }
                }
            } catch (Exception e) {
            }
            if (dataPerPage > lstdetails.size()) {
                dataPerPage = lstdetails.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (lstdetails.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }

            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                rest.service.filtre.LigneRecapOrganisme ligne = lstdetails.get(i);
                JSONObject json = new JSONObject();
                json.put("id", i);
                json.put("TYPEORGANISME", ligne.getTypeOrganisme());
                json.put("CODEORGANISME", ligne.getCodeOrganisme());
                json.put("NUMORGANISME", ligne.getNumeroCompte());
                json.put("COMPTECOMPTABLE", ligne.getCompteComptable());
                json.put("MONTANTOP", ligne.getDebit());
                json.put("MONTANTSOLDE", ligne.getSolde());
                json.put("FULNAME", ligne.getOrganisme());
                json.put("CREDIT", ligne.getCredit());
                json.put("GROUPE", ligne.getGroupe());
                arrayObj.put(json);
            }
            return Response.ok()
                    .entity(new JSONObject().put("data", arrayObj).put("total", lstdetails.size()).toString()).build();
        } catch (Exception e) {
            // Un tableau vide renvoye en succes faisait croire a l'utilisateur qu'aucun reglement
            // n'existait sur la periode, et le Centre de Support ne recevait rien : il n'enregistre
            // que les appels en erreur. On repond donc en erreur, avec la cause en clair.
            LOG.log(Level.SEVERE, "recapitulatif par compte organisme", e);
            // signalerAuSupport enregistre l'incident dans le Centre de Support ET renvoie la cause en
            // langage clair. La reponse part en ERREUR : c'est aussi ce qui declenche la remontee cote
            // navigateur (Ext.Ajax requestexception), muette tant qu'on repondait "succes".
            String cause = signalerAuSupport("du recapitulatif par compte organisme", e);
            return Response.serverError().entity(new JSONObject().put("success", "0").put("data", new JSONArray())
                    .put("total", 0).put("errors", "Le récapitulatif n'a pas pu être calculé : " + cause).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Lignes du recapitulatif, nommees et enrichies de leur groupe de tiers payants.
     *
     * <p>
     * La procedure stockee rend des colonnes anonymes et ne connait pas le groupe. Celui-ci est resolu en une seule
     * requete, a partir du code organisme : une requete par ligne rendrait l'ecran inutilisable des la centaine de
     * comptes.
     */
    private List<rest.service.filtre.LigneRecapOrganisme> lignesRecapOrganisme(dataManager odm,
            StatisticsFamilleArticle familleArticle, String dtStart, String dtEnd, String tiersPayantId,
            String search) {
        List<EntityData> brutes = familleArticle.getRecapReglementByOrganismeData(dtStart, dtEnd, tiersPayantId,
                search);
        Map<String, String> groupeParCode = groupesParCodeOrganisme(odm);
        List<rest.service.filtre.LigneRecapOrganisme> lignes = new java.util.ArrayList<>();
        for (EntityData brute : brutes) {
            rest.service.filtre.LigneRecapOrganisme ligne = new rest.service.filtre.LigneRecapOrganisme();
            ligne.setOrganisme(brute.getStr_value1());
            ligne.setTypeOrganisme(brute.getStr_value2());
            ligne.setCodeOrganisme(brute.getStr_value3());
            ligne.setCompteComptable(brute.getStr_value4());
            ligne.setNumeroCompte(brute.getStr_value5());
            ligne.setDebit(brute.getStr_value6());
            ligne.setCredit(brute.getStr_value7());
            ligne.setSolde(brute.getStr_value8());
            ligne.setGroupe(groupeParCode.get(StringUtils.trimToEmpty(brute.getStr_value3())));
            lignes.add(ligne);
        }
        return lignes;
    }

    /** Code organisme -> libelle du groupe de tiers payants, en une requete. */
    private Map<String, String> groupesParCodeOrganisme(dataManager odm) {
        Map<String, String> groupes = new java.util.HashMap<>();
        try {
            String sql = "SELECT tp.str_CODE_ORGANISME, g.str_LIBELLE FROM t_tiers_payant tp"
                    + " JOIN t_groupe_tierspayant g ON g.lg_GROUPE_ID = tp.lg_GROUPE_ID"
                    + " WHERE tp.str_CODE_ORGANISME IS NOT NULL";
            for (Object[] row : (List<Object[]>) odm.getEm().createNativeQuery(sql).getResultList()) {
                groupes.put(StringUtils.trimToEmpty(String.valueOf(row[0])), String.valueOf(row[1]));
            }
        } catch (Exception e) {
            // Le groupe n'est qu'un critere de confort : sans lui l'ecran reste utilisable.
            LOG.log(Level.WARNING, "groupes de tiers payants du recapitulatif", e);
        }
        return groupes;
    }

    /**
     * Edition PDF du recapitulatif, REGROUPEE par groupe de tiers payants, avec un sous-total par groupe et un total
     * general (point 10).
     *
     * <p>
     * L'edition precedente passait par un modele installe sur chaque poste, qui refaisait sa propre requete : on ne
     * pouvait ni y porter les nouveaux filtres, ni y ajouter les regroupements. Le modele est desormais embarque dans
     * l'application et alimente par la MEME liste que l'ecran, criteres compris - ce qui est imprime est donc
     * exactement ce qui est affiche.
     *
     * @return l'URL du PDF genere, que l'ecran ouvre dans un onglet.
     */
    @GET
    @Path("recap-organisme/print")
    public Response recapOrganismePrint(@DefaultValue("") @QueryParam("dt_start_vente") String dtStartParam,
            @DefaultValue("") @QueryParam("dt_end_vente") String dtEndParam,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("operateurMontant") String operateurMontant,
            @DefaultValue("") @QueryParam("valeurMontant") String valeurMontant,
            @DefaultValue("") @QueryParam("typeTiersPayant") String typeTiersPayant,
            @DefaultValue("") @QueryParam("groupeTiersPayant") String groupeTiersPayant) {
        TUser user = utilisateurSession();
        if (user == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam
                    : date.formatterMysqlShort.format(new Date());
            String tiersPayantId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";
            String search = StringUtils.isNotEmpty(searchValue) ? searchValue : "%%";
            odm.initEntityManager();
            rest.service.filtre.FiltresRecapOrganisme filtres = new rest.service.filtre.FiltresRecapOrganisme(
                    operateurMontant, valeurMontant, typeTiersPayant, groupeTiersPayant);
            List<rest.service.filtre.LigneRecapOrganisme> lignes = filtres.appliquer(lignesRecapOrganisme(odm,
                    new StatisticsFamilleArticle(odm), dtStart, dtEnd, tiersPayantId, search));
            // Le regroupement de Jasper suppose la liste DEJA triee par groupe : sinon un meme
            // groupe reapparait plusieurs fois, avec autant de sous-totaux partiels.
            lignes.sort(java.util.Comparator
                    .comparing(rest.service.filtre.LigneRecapOrganisme::getGroupeLibelle, String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(l -> StringUtils.trimToEmpty(l.getOrganisme()), String.CASE_INSENSITIVE_ORDER));

            Map<String, Object> parametres = reportUtil.officineData(user);
            parametres.put("P_H_CLT_INFOS", "RÉCAPITULATIF PAR COMPTE ORGANISME");
            StringBuilder periode = new StringBuilder("Période du " + dtStart + " au " + dtEnd);
            for (String critere : filtres.libelles()) {
                periode.append("   |   ").append(critere);
            }
            periode.append("   |   ").append(lignes.size()).append(" compte(s)");
            parametres.put("P_PERIODE", periode.toString());
            String url = reportUtil.buildReport(parametres, "recapitulatif_organisme", lignes);
            // buildReport rattrape ses erreurs et rend le chemin quand meme : sans ce controle,
            // l'ecran ouvrait un onglet sur un fichier inexistant et l'utilisateur ne voyait
            // qu'une page blanche, sans savoir que l'edition avait echoue.
            if (StringUtils.isNotBlank(url)
                    && !new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1)))
                            .exists()) {
                LOG.log(Level.SEVERE, "edition du recapitulatif : le PDF {0} n''a pas ete produit", url);
                url = "";
            }
            if (StringUtils.isBlank(url)) {
                return Response.ok().entity(
                        new JSONObject().put("success", false).put("msg", "Impossible de générer le PDF").toString())
                        .build();
            }
            return Response.ok().entity(new JSONObject().put("success", true).put("msg", url).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "edition du recapitulatif par compte organisme", e);
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("msg", "Impossible de générer le PDF").toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Export Excel du recapitulatif par compte organisme (point 10) : memes criteres que l'ecran, et TOUTES les lignes
     * du resultat, la grille restant paginee.
     */
    @GET
    @Path("recap-organisme/export-excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response recapOrganismeExcel(@DefaultValue("") @QueryParam("dt_start_vente") String dtStartParam,
            @DefaultValue("") @QueryParam("dt_end_vente") String dtEndParam,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("operateurMontant") String operateurMontant,
            @DefaultValue("") @QueryParam("valeurMontant") String valeurMontant,
            @DefaultValue("") @QueryParam("typeTiersPayant") String typeTiersPayant,
            @DefaultValue("") @QueryParam("groupeTiersPayant") String groupeTiersPayant) throws java.io.IOException {
        if (utilisateurSession() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam
                    : date.formatterMysqlShort.format(new Date());
            String tiersPayantId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";
            String search = StringUtils.isNotEmpty(searchValue) ? searchValue : "%%";
            odm.initEntityManager();
            rest.service.filtre.FiltresRecapOrganisme filtres = new rest.service.filtre.FiltresRecapOrganisme(
                    operateurMontant, valeurMontant, typeTiersPayant, groupeTiersPayant);
            List<rest.service.filtre.LigneRecapOrganisme> lignes = filtres.appliquer(lignesRecapOrganisme(odm,
                    new StatisticsFamilleArticle(odm), dtStart, dtEnd, tiersPayantId, search));

            rest.report.excel.ClasseurExcel<rest.service.filtre.LigneRecapOrganisme> classeur = new rest.report.excel.ClasseurExcel<rest.service.filtre.LigneRecapOrganisme>(
                    "Récapitulatif").titre("RÉCAPITULATIF PAR COMPTE ORGANISME")
                            .critere("Période", dtStart + " au " + dtEnd)
                            .critere("Recherche", "%%".equals(search) ? "" : search);
            filtres.libelles().forEach(classeur::critere);
            byte[] contenu = classeur.texte("Type organisme", rest.service.filtre.LigneRecapOrganisme::getTypeOrganisme)
                    .texte("Organisme", rest.service.filtre.LigneRecapOrganisme::getOrganisme)
                    .texte("Groupe", rest.service.filtre.LigneRecapOrganisme::getGroupe)
                    .texte("Code organisme", rest.service.filtre.LigneRecapOrganisme::getCodeOrganisme)
                    .texte("Numéro compte", rest.service.filtre.LigneRecapOrganisme::getNumeroCompte)
                    .texte("Compte comptable", rest.service.filtre.LigneRecapOrganisme::getCompteComptable)
                    .nombre("Débit", rest.service.filtre.LigneRecapOrganisme::getDebit)
                    .nombre("Crédit", rest.service.filtre.LigneRecapOrganisme::getCredit)
                    .nombre("Solde", rest.service.filtre.LigneRecapOrganisme::getSolde).construire(lignes);
            return rest.report.excel.NomFichierExport.reponse(contenu, "recapitulatif_organisme");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "export du recapitulatif par compte organisme", e);
            return Response.serverError().build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Liste des tiers payants pour les ecrans de reglement : port de
     * tierspayantmanagement/tierspayant/ws_search_data.jsp (MEME methode metier ShowAllOrOneTierspayant, memes cles
     * JSON). Le decoupage respecte start/limit quand l'ecran les envoie (la JSP decoupait toujours par 10, d'ou des
     * pages identiques quand la taille de page differait).
     */
    @GET
    @Path("tierspayants")
    public Response tierspayants(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("lg_TYPE_TIERS_PAYANT_ID") String lgTypeTiersPayantId,
            @DefaultValue("") @QueryParam("cmb_TYPE_TIERS_PAYANT") String cmbTypeTiersPayant,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("10") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        }
        dataManager odm = new dataManager();
        try {
            String search = StringUtils.isNotEmpty(query) ? query : searchValue;
            String tpId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";
            String typeTp = "%%";
            if (StringUtils.isNotEmpty(lgTypeTiersPayantId)) {
                typeTp = lgTypeTiersPayantId;
            }
            if (StringUtils.isNotEmpty(cmbTypeTiersPayant)) {
                typeTp = cmbTypeTiersPayant;
            }
            odm.initEntityManager();
            tierspayantManagement otm = new tierspayantManagement(odm);
            List<TTiersPayant> lst = otm.ShowAllOrOneTierspayant(StringUtils.defaultString(search), tpId, typeTp,
                    commonparameter.statut_enable);
            int fin = limit > 0 ? Math.min(lst.size(), Math.max(0, start) + limit) : lst.size();
            JSONArray arrayObj = new JSONArray();
            for (int i = Math.max(0, start); i < fin; i++) {
                TTiersPayant t = lst.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_TIERS_PAYANT_ID", t.getLgTIERSPAYANTID());
                json.put("str_CODE_ORGANISME", t.getStrCODEORGANISME());
                json.put("str_NAME", t.getStrNAME());
                json.put("str_FULLNAME", t.getStrFULLNAME());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lst.size() + " \",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste tiers payants reglement", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Types de tiers payant : port de tierspayantmanagement/typetierspayant/ws_data.jsp (MEME requete, memes cles
     * JSON), avec decoupage start/limit.
     */
    @GET
    @Path("types-tierspayant")
    public Response typesTierspayant(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("lg_TYPE_TIERS_PAYANT_ID") String lgTypeTiersPayantId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        }
        dataManager odm = new dataManager();
        try {
            String typeTp = "%%";
            if (StringUtils.isNotEmpty(lgTypeTiersPayantId) && !"ALL".equals(lgTypeTiersPayantId)) {
                typeTp = lgTypeTiersPayantId;
            }
            String search = "%" + StringUtils.defaultString(searchValue) + "%";
            odm.initEntityManager();
            List<TTypeTiersPayant> lst = odm.getEm().createQuery(
                    "SELECT t FROM TTypeTiersPayant t WHERE t.lgTYPETIERSPAYANTID LIKE ?1 AND t.strCODETYPETIERSPAYANT LIKE ?2 AND t.strSTATUT LIKE ?3 ")
                    .setParameter(1, typeTp).setParameter(2, search).setParameter(3, commonparameter.statut_enable)
                    .getResultList();
            int fin = limit > 0 ? Math.min(lst.size(), Math.max(0, start) + limit) : lst.size();
            JSONArray arrayObj = new JSONArray();
            date key = new date();
            for (int i = Math.max(0, start); i < fin; i++) {
                TTypeTiersPayant t = lst.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_TYPE_TIERS_PAYANT_ID", t.getLgTYPETIERSPAYANTID());
                json.put("str_CODE_TYPE_TIERS_PAYANT", t.getStrCODETYPETIERSPAYANT());
                json.put("str_LIBELLE_TYPE_TIERS_PAYANT", t.getStrLIBELLETYPETIERSPAYANT());
                json.put("str_STATUT", t.getStrSTATUT());
                if (t.getDtCREATED() != null) {
                    json.put("dt_CREATED", key.DateToString(t.getDtCREATED(), key.formatterOrange));
                }
                if (t.getDtUPDATED() != null) {
                    json.put("dt_UPDATED", key.DateToString(t.getDtUPDATED(), key.formatterOrange));
                }
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lst.size() + " \",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "types tiers payant", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Types de facture du combo "Type de facture" des ecrans de facturation.
     *
     * Les ecrans pointaient vers webservices/sm_user/typefacture/ws_data.jsp, un fichier qui n'existe pas sur le
     * serveur : le combo restait donc toujours vide. Les cles JSON sont celles attendues par le modele d'ecran
     * (lg_TYPE_FACTURE_ID, str_LIBELLE, str_STATUT, dt_CREATED, dt_UPDATED).
     */
    @GET
    @Path("types-facture")
    public Response typesFacture(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("lg_TYPE_FACTURE_ID") String lgTypeFactureId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        }
        dataManager odm = new dataManager();
        try {
            String id = "%%";
            if (StringUtils.isNotEmpty(lgTypeFactureId) && !"ALL".equals(lgTypeFactureId)) {
                id = lgTypeFactureId;
            }
            String recherche = StringUtils.isNotEmpty(query) ? query : searchValue;
            String search = "%" + StringUtils.defaultString(recherche) + "%";
            odm.initEntityManager();
            List<TTypeFacture> lst = odm.getEm()
                    .createQuery(
                            "SELECT t FROM TTypeFacture t WHERE t.lgTYPEFACTUREID LIKE ?1 "
                                    + "AND t.strLIBELLE LIKE ?2 AND t.strSTATUT LIKE ?3 ORDER BY t.strLIBELLE ASC",
                            TTypeFacture.class)
                    .setParameter(1, id).setParameter(2, search).setParameter(3, commonparameter.statut_enable)
                    .getResultList();
            date key = new date();
            JSONArray arrayObj = new JSONArray();
            for (int i = PaginationUtil.debut(start, lst.size()); i < PaginationUtil.fin(start, limit,
                    lst.size()); i++) {
                TTypeFacture t = lst.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_TYPE_FACTURE_ID", t.getLgTYPEFACTUREID());
                json.put("str_LIBELLE", t.getStrLIBELLE());
                json.put("str_STATUT", t.getStrSTATUT());
                if (t.getDtCREATED() != null) {
                    json.put("dt_CREATED", key.DateToString(t.getDtCREATED(), key.formatterOrange));
                }
                if (t.getDtUPDATED() != null) {
                    json.put("dt_UPDATED", key.DateToString(t.getDtUPDATED(), key.formatterOrange));
                }
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("total", lst.size()).put("results", arrayObj).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "types de facture", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Grossistes (fournisseurs) du combo des ecrans de facturation : port de configmanagement/grossiste/ws_data.jsp.
     *
     * Delegue a la MEME methode metier que la JSP (grossisteManagement.getListeGrossiste), memes cles JSON, y compris
     * le drapeau BTNDELETE calcule par le meme controle de privilege.
     */
    @GET
    @Path("grossistes")
    public Response grossistes(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("lg_GROSSISTE_ID") String lgGrossisteId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = utilisateurSession();
        if (user == null) {
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        }
        dataManager odm = new dataManager();
        try {
            String id = StringUtils.isNotEmpty(lgGrossisteId) ? lgGrossisteId : "%%";
            String recherche = StringUtils.isNotEmpty(query) ? query : searchValue;
            odm.initEntityManager();
            grossisteManagement ogm = new grossisteManagement(odm);
            List<TGrossiste> lst = ogm.getListeGrossiste(StringUtils.defaultString(recherche), id);
            boolean btnDelete = new privilege(odm, user).isColonneStockMachineIsAuthorize(Parameter.P_BT_DELETE);
            date key = new date();
            JSONArray arrayObj = new JSONArray();
            for (int i = PaginationUtil.debut(start, lst.size()); i < PaginationUtil.fin(start, limit,
                    lst.size()); i++) {
                TGrossiste g = lst.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_GROSSISTE_ID", g.getLgGROSSISTEID());
                json.put("str_LIBELLE", g.getStrLIBELLE());
                json.put("str_DESCRIPTION", g.getStrDESCRIPTION());
                json.put("str_ADRESSE_RUE_1", g.getStrADRESSERUE1());
                json.put("str_ADRESSE_RUE_2", g.getStrADRESSERUE2());
                json.put("str_CODE_POSTAL", g.getStrCODEPOSTAL());
                json.put("str_BUREAU_DISTRIBUTEUR", g.getStrBUREAUDISTRIBUTEUR());
                json.put("str_MOBILE", g.getStrMOBILE());
                json.put("str_TELEPHONE", g.getStrTELEPHONE());
                json.put("int_DELAI_REGLEMENT_AUTORISE", g.getIntDELAIREGLEMENTAUTORISE());
                json.put("str_CODE", g.getStrCODE());
                if (g.getGroupeId() != null) {
                    json.put("groupeId", g.getGroupeId().getId() + "");
                }
                json.put("idrepartiteur", g.getIdRepartiteur());
                json.put("str_URL_PHARMAML", g.getStrURLPHARMAML());
                json.put("str_CODE_RECEPTEUR_PHARMA", g.getStrCODERECEPTEURPHARMA());
                json.put("str_ID_RECEPTEUR_PHARMA", g.getStrIDRECEPTEURPHARMA());
                json.put("str_OFFICINE_ID", g.getStrOFFICINEID());
                json.put("dbl_CHIFFRE_DAFFAIRE", g.getDblCHIFFREDAFFAIRE());
                json.put("lg_CUSTOMER_ID", g.getLgGROSSISTEID());
                if (g.getLgTYPEREGLEMENTID() != null) {
                    json.put("lg_TYPE_REGLEMENT_ID", g.getLgTYPEREGLEMENTID().getStrNAME());
                }
                if (g.getLgVILLEID() != null) {
                    json.put("lg_VILLE_ID", g.getLgVILLEID().getStrName());
                }
                json.put("str_STATUT", g.getStrSTATUT());
                json.put("int_DELAI_REAPPROVISIONNEMENT", g.getIntDELAIREAPPROVISIONNEMENT());
                json.put("int_COEF_SECURITY", g.getIntCOEFSECURITY());
                json.put("int_DATE_BUTOIR_ARTICLE", g.getIntDATEBUTOIRARTICLE());
                if (g.getDtCREATED() != null) {
                    json.put("dt_CREATED", key.DateToString(g.getDtCREATED(), key.formatterShort));
                }
                if (g.getDtUPDATED() != null) {
                    json.put("dt_UPDATED", key.DateToString(g.getDtUPDATED(), key.formatterShort));
                }
                json.put("BTNDELETE", btnDelete);
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("total", lst.size()).put("results", arrayObj).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste grossistes facturation", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Clients rattaches a un tiers payant : port de tierspayantmanagement/tierspayant/ws_clients_data_tierspayants.jsp
     * (MEME methode metier, memes cles JSON, meme enveloppe "data").
     */
    @GET
    @Path("clients-tierspayant")
    public Response clientsTierspayant(@DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit) {
        TUser user = utilisateurSession();
        if (user == null) {
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).toString()).build();
        }
        dataManager odm = new dataManager();
        try {
            String tpId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";
            odm.initEntityManager();
            List<TClient> lst = new factureManagement(odm, user).getAllClients(tpId);
            JSONArray arrayObj = new JSONArray();
            for (int i = PaginationUtil.debut(start, lst.size()); i < PaginationUtil.fin(start, limit,
                    lst.size()); i++) {
                TClient c = lst.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_CLIENT_ID", c.getLgCLIENTID());
                json.put("str_FIRST_NAME_LAST_NAME", StringUtils.defaultString(c.getStrFIRSTNAME()) + " "
                        + StringUtils.defaultString(c.getStrLASTNAME()));
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("data", arrayObj).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "clients d'un tiers payant", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
