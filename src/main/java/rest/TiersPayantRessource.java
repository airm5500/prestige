/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import bll.Util;
import bll.tierspayantManagement.tierspayantManagement;
import dal.TPrivilege;
import dal.TUser;
import dal.dataManager;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
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
import rest.service.TiersPayantService;
import toolkits.parameters.commonparameter;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Path("v1/tierspayant")
@Produces("application/json")
@Consumes("application/json")
public class TiersPayantRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private TiersPayantService tiersPayantService;

    @GET
    @Path("list")
    @Produces("application/json")
    public Response fetchList(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "search_value") String search,
            @QueryParam(value = "lg_TYPE_TIERS_PAYANT_ID") String typeTierspayant,
            @QueryParam(value = "cmb_TYPE_TIERS_PAYANT") String id) {
        HttpSession hs = servletRequest.getSession();
        List<TPrivilege> privileges = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean delete = DateConverter.hasAuthorityById(privileges, Util.ACTIONDELETE);
        boolean btnDesactive = DateConverter.hasAuthorityByName(privileges, Constant.P_BTN_DESACTIVER_TIERS_PAYANT);

        if (StringUtils.isNoneEmpty(query)) {
            search = query;
        }

        if (StringUtils.isNoneEmpty(id)) {
            typeTierspayant = id;
        }

        return Response.ok().entity(
                tiersPayantService.fetchList(start, limit, search, typeTierspayant, btnDesactive, delete).toString())
                .build();
    }

    @GET
    @Path("encours")
    @Produces("application/json")
    public Response encours(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search_value") String search, @QueryParam(value = "tp") String lg_TIERS_PAYANT_ID) {
        HttpSession hs = servletRequest.getSession();

        return Response.ok().entity(tiersPayantService.getAccount(lg_TIERS_PAYANT_ID)).build();
    }

    // =============================================================================================
    // Ecran Gestion des tiers payants : modification, desactivation/reactivation, suppression et
    // consultation du detail. Toutes ces operations deleguent aux MEMES methodes metier
    // bll.tierspayantManagement / bll.clientManagement que les JSP historiques
    // (tierspayantmanagement/tierspayant/ws_transaction.jsp, ws_client.jsp, ws_tierspayantaccount.jsp) :
    // memes regles, memes messages, memes cles JSON.
    // =============================================================================================

    private static final Logger LOG_GESTION = Logger.getLogger(TiersPayantRessource.class.getName());
    /** Valeur par defaut historique de ws_transaction.jsp pour le risque. */
    private static final String RISQUE_DEFAUT = "55181642844215217016";

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response reponseDeconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    private Response reponseSimple(String success, String errors) {
        return Response.ok().entity(
                new JSONObject().put("success", success).put("errors", StringUtils.defaultString(errors)).toString())
                .build();
    }

    /**
     * Modification d'un tiers payant : MEME methode metier tierspayantManagement.update que la JSP historique
     * (mode=update), avec les MEMES valeurs par defaut quand un champ n'est pas transmis.
     */
    @POST
    @Path("gestion/update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response modifierGestion(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("") @FormParam("str_CODE_ORGANISME") String codeOrganisme,
            @DefaultValue("") @FormParam("str_NAME") String name,
            @DefaultValue("") @FormParam("str_FULLNAME") String fullName,
            @DefaultValue("") @FormParam("str_ADRESSE") String adresse,
            @DefaultValue("") @FormParam("str_MOBILE") String mobile,
            @DefaultValue("") @FormParam("str_TELEPHONE") String telephone,
            @DefaultValue("") @FormParam("str_MAIL") String mail,
            @DefaultValue("0") @FormParam("dbl_PLAFOND_CREDIT") double plafondCredit,
            @DefaultValue("0") @FormParam("dbl_TAUX_REMBOURSEMENT") double tauxRemboursement,
            @DefaultValue("") @FormParam("str_NUMERO_CAISSE_OFFICIEL") String numeroCaisseOfficiel,
            @DefaultValue("") @FormParam("str_CENTRE_PAYEUR") String centrePayeur,
            @DefaultValue("") @FormParam("str_CODE_REGROUPEMENT") String codeRegroupement,
            @DefaultValue("0") @FormParam("dbl_SEUIL_MINIMUM") double seuilMinimum,
            @DefaultValue("false") @FormParam("bool_INTERDICTION") boolean interdiction,
            @DefaultValue("46700000000") @FormParam("str_CODE_COMPTABLE") String codeComptable,
            @DefaultValue("false") @FormParam("bool_PRENUM_FACT_SUBROGATOIRE") boolean prenumFactSubrogatoire,
            @DefaultValue("0") @FormParam("int_NUMERO_DECOMPTE") int numeroDecompte,
            @DefaultValue("") @FormParam("str_CODE_PAIEMENT") String codePaiement,
            @DefaultValue("0") @FormParam("dt_DELAI_PAIEMENT") int delaiPaiement,
            @DefaultValue("0") @FormParam("dbl_POURCENTAGE_REMISE") double pourcentageRemise,
            @DefaultValue("0") @FormParam("dbl_REMISE_FORFETAIRE") double remiseForfetaire,
            @DefaultValue("") @FormParam("str_CODE_EDIT_BORDEREAU") String codeEditBordereau,
            @DefaultValue("1") @FormParam("int_NBRE_EXEMPLAIRE_BORD") int nbreExemplaireBord,
            @DefaultValue("0") @FormParam("int_PERIODICITE_EDIT_BORD") int periodiciteEditBord,
            @DefaultValue("0") @FormParam("int_DATE_DERNIERE_EDITION") int dateDerniereEdition,
            @DefaultValue("") @FormParam("str_NUMERO_IDF_ORGANISME") String numeroIdfOrganisme,
            @DefaultValue("0") @FormParam("dbl_MONTANT_F_CLIENT") double montantFClient,
            @DefaultValue("0") @FormParam("dbl_BASE_REMISE") double baseRemise,
            @DefaultValue("") @FormParam("str_CODE_DOC_COMPTOIRE") String codeDocComptoire,
            @DefaultValue("false") @FormParam("bool_ENABLED") boolean enabled,
            @DefaultValue("") @FormParam("lg_VILLE_ID") String villeId,
            @DefaultValue("") @FormParam("lg_TYPE_TIERS_PAYANT_ID") String typeTiersPayantId,
            @DefaultValue("") @FormParam("lg_TYPE_CONTRAT_ID") String typeContratId,
            @DefaultValue("") @FormParam("lg_REGIMECAISSE_ID") String regimeCaisseId,
            @DefaultValue("") @FormParam("lg_RISQUE_ID") String risqueId,
            @DefaultValue("") @FormParam("str_CODE_OFFICINE") String codeOfficine,
            @DefaultValue("") @FormParam("str_REGISTRE_COMMERCE") String registreCommerce,
            @DefaultValue("") @FormParam("str_COMPTE_CONTRIBUABLE") String compteContribuable,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_MENSUELLE") double quotaConsoMensuelle,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute,
            @DefaultValue("") @FormParam("lg_GROUPE_ID") String groupeId,
            @DefaultValue("-1") @FormParam("nbrbons") int nbrBons,
            @DefaultValue("-1") @FormParam("montantFact") int montantFact,
            @DefaultValue("false") @FormParam("groupingByTaux") boolean groupingByTaux,
            @DefaultValue("false") @FormParam("cmu") boolean cmu, @DefaultValue("0") @FormParam("caution") int caution,
            @DefaultValue("ALPHABETIQUE") @FormParam("str_MODE_TRI_FACTURE") String strModeTriFacture,
            @FormParam("int_NB_BONS_PAR_PAGE") Integer nbBonsParPage,
            @FormParam("int_TAILLE_POLICE") Integer taillePolice) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            otm.update(tiersPayantId, codeOrganisme, name, fullName, adresse, mobile, telephone, mail, plafondCredit,
                    tauxRemboursement, numeroCaisseOfficiel, centrePayeur, codeRegroupement, seuilMinimum, interdiction,
                    codeComptable, prenumFactSubrogatoire, numeroDecompte, codePaiement, delaiPaiement,
                    pourcentageRemise, remiseForfetaire, codeEditBordereau, nbreExemplaireBord, periodiciteEditBord,
                    dateDerniereEdition, numeroIdfOrganisme, montantFClient, baseRemise, codeDocComptoire, enabled,
                    villeId, typeTiersPayantId, typeContratId, regimeCaisseId, risque, codeOfficine, registreCommerce,
                    compteContribuable, quotaConsoMensuelle, isAbsolute, groupeId, nbrBons, montantFact, groupingByTaux,
                    cmu, caution, strModeTriFacture, nbBonsParPage, taillePolice);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "updateTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de modifier ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Suppression d'un tiers payant : MEME methode metier que la JSP historique (mode=delete). */
    @POST
    @Path("gestion/delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response supprimerGestion(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            otm.deleteTierspayant(StringUtils.defaultString(tiersPayantId));
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "deleteTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de supprimer ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Desactivation / reactivation d'un tiers payant : MEME methode metier que les modes disable / enable de la JSP
     * historique.
     */
    @POST
    @Path("gestion/toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response basculerStatutGestion(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("false") @FormParam("actif") boolean actif) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            otm.enableOrDisableTierspayant(StringUtils.defaultString(tiersPayantId),
                    actif ? Constant.STATUT_ENABLE : Constant.STATUT_DISABLE);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "toggleStatutTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de changer le statut de ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Clients d'un tiers payant (onglet Clients du detail) : MEME methode metier et MEMES cles JSON que la JSP
     * historique ws_client.jsp (reponse {total, data}).
     */
    @GET
    @Path("gestion/clients")
    public Response clientsGestion(@QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @QueryParam("query") String query, @QueryParam("search_value") String searchValue,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String recherche = StringUtils.isNotBlank(query) ? query
                    : (StringUtils.isNotBlank(searchValue) ? searchValue : "%%");
            List<dal.TClient> clients = new bll.preenregistrement.Preenregistrement(odm, null).getAllClients(recherche,
                    StringUtils.defaultString(tiersPayantId));
            JSONArray data = new JSONArray();
            int fin = limit > 0 ? Math.min(clients.size(), Math.max(0, start) + limit) : clients.size();
            for (int i = Math.max(0, start); i < fin; i++) {
                dal.TClient c = clients.get(i);
                data.put(new JSONObject().put("lg_CLIENT_ID", c.getLgCLIENTID())
                        .put("str_FIRST_LAST_NAME",
                                StringUtils.trimToEmpty(c.getStrFIRSTNAME()) + " "
                                        + StringUtils.trimToEmpty(c.getStrLASTNAME()))
                        .put("str_NUMERO_SECURITE_SOCIAL", StringUtils.trimToEmpty(c.getStrNUMEROSECURITESOCIAL()))
                        .put("str_CODE_INTERNE", StringUtils.defaultString(c.getStrCODEINTERNE()))
                        .put("dt_NAISSANCE",
                                c.getDtCREATED() != null ? toolkits.utils.date.DateToString(c.getDtNAISSANCE(),
                                        toolkits.utils.date.formatterShort) : "")
                        .put("str_SEXE", StringUtils.defaultString(c.getStrSEXE())));
            }
            return Response.ok().entity(new JSONObject().put("data", data).put("total", clients.size()).toString())
                    .build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "clientsTiersPayant", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Situation du compte d'un tiers payant (onglet Compte du detail) : MEME methode metier
     * clientManagement.getTiersPayantDATA et MEME reponse {total, data} que la JSP ws_tierspayantaccount.jsp.
     */
    @GET
    @Path("gestion/compte")
    public Response compteGestion(@QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @QueryParam("dt_start_vente") String dtStart, @QueryParam("dt_end_vente") String dtEnd) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // Memes bornes par defaut que la JSP historique
            String debut = StringUtils.isNotBlank(dtStart) ? dtStart
                    : toolkits.utils.date.formatterMysqlShort.format(java.sql.Date.valueOf("2015-12-01"));
            String fin = StringUtils.isNotBlank(dtEnd) ? dtEnd
                    : toolkits.utils.date.formatterMysqlShort.format(new java.util.Date());
            JSONArray data = new bll.configManagement.clientManagement(odm).getTiersPayantDATA(debut, fin,
                    StringUtils.defaultString(tiersPayantId));
            return Response.ok().entity(new JSONObject().put("data", data).put("total", 1).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "compteTiersPayant", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

}
