package rest;

import bll.configManagement.clientManagement;
import dal.TCompteClient;
import dal.TPrivilege;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
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
import rest.service.ClientsService;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Gestion des clients en REST (ecran Gestion des Clients). La CONSULTATION passe par un service optimise (requetes
 * groupees par page) ; la CREATION, la MODIFICATION et la DESACTIVATION delegent aux MEMES methodes metier
 * bll.clientManagement que la JSP historique (createClient / update2 / enableOrDisableClient) : memes regles, memes
 * messages, zero changement de comportement. Chemin v1/clients, distinct de v1/client (consommation).
 */
@Path("v1/clients")
@Produces("application/json")
@Consumes("application/json")
public class ClientsRessource {

    private static final Logger LOG = Logger.getLogger(ClientsRessource.class.getName());
    /** Valeurs par defaut historiques de ws_transaction.jsp. */
    private static final String CATEGORIE_AYANT_DROIT_DEFAUT = "555146116095894790";
    private static final String RISQUE_DEFAUT = "55181642844215217016";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ClientsService clientsService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private List<TPrivilege> sessionPrivileges() {
        return (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    private Response reponseTransaction(String success, String errors) {
        return Response.ok()
                .entity(new JSONObject().put("success", success).put("errors", StringUtils.defaultString(errors))
                        .put("total_differe", 0).put("isCustSolvable", 0)
                        .put("results", new JSONArray().put(new JSONObject())).toString())
                .build();
    }

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @QueryParam("lg_TYPE_CLIENT_ID") String typeClientId,
            @DefaultValue("true") @QueryParam("actifs") boolean actifs,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        List<TPrivilege> privileges = sessionPrivileges();
        boolean btnDelete = CommonUtils.hasAuthorityById(privileges, DateConverter.ACTIONDELETE);
        boolean btnDesactiver = CommonUtils.hasAuthorityByName(privileges, DateConverter.P_BTN_DESACTIVER_CLIENT);
        return Response
                .ok().entity(clientsService
                        .listClients(search, typeClientId, actifs, btnDelete, btnDesactiver, start, limit).toString())
                .build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("str_FIRST_NAME") String firstName, @FormParam("str_LAST_NAME") String lastName,
            @FormParam("str_NUMERO_SECURITE_SOCIAL") String numeroSecuriteSocial,
            @FormParam("dt_NAISSANCE") String dtNaissance, @FormParam("str_SEXE") String sexe,
            @FormParam("str_ADRESSE") String adresse, @FormParam("str_DOMICILE") String domicile,
            @FormParam("str_AUTRE_ADRESSE") String autreAdresse, @FormParam("str_CODE_POSTAL") String codePostal,
            @FormParam("str_COMMENTAIRE") String commentaire, @FormParam("lg_VILLE_ID") String villeId,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_MENSUELLE") double quotaConsoMensuelle,
            @DefaultValue("0") @FormParam("dbl_CAUTION") double caution,
            @DefaultValue("0") @FormParam("dbl_SOLDE") int solde, @FormParam("lg_TYPE_CLIENT_ID") String typeClientId,
            @FormParam("lg_CATEGORIE_AYANTDROIT_ID") String categorieAyantDroitId,
            @FormParam("lg_RISQUE_ID") String risqueId, @FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("0") @FormParam("int_POURCENTAGE") int pourcentage,
            @DefaultValue("1") @FormParam("int_PRIORITY") int priority,
            @FormParam("str_CODE_INTERNE") String codeInterne,
            @DefaultValue("0") @FormParam("dbl_PLAFOND") double plafond, @FormParam("lg_COMPANY_ID") String companyId,
            @DefaultValue("0") @FormParam("db_PLAFOND_ENCOURS") int plafondEncours,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute,
            @FormParam("remiseId") String remiseId, @FormParam("lg_TYPE_TIERS_PAYANT_ID") String typeTiersPayantId) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            clientManagement ocm = new clientManagement(odm, user);
            // Regles historiques de ws_transaction.jsp (mode=create)
            String typeClient = StringUtils.defaultString(typeClientId);
            if ("1".equals(typeTiersPayantId) || "2".equals(typeTiersPayantId)) {
                typeClient = typeTiersPayantId;
            }
            String categorie = StringUtils.isNotBlank(categorieAyantDroitId) ? categorieAyantDroitId
                    : CATEGORIE_AYANT_DROIT_DEFAUT;
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            Date naissance = StringUtils.isNotBlank(dtNaissance)
                    ? new date().stringToDate(dtNaissance, date.formatterMysqlShort) : null;
            // MEME appel que la JSP historique : dbl_PLAFOND est bien passe dans le meme emplacement d'argument
            TCompteClient compte = ocm.createClient(firstName, lastName, numeroSecuriteSocial, naissance, sexe, adresse,
                    domicile, autreAdresse, codePostal, commentaire, villeId, quotaConsoMensuelle, caution, solde,
                    typeClient, categorie, risque, tiersPayantId, pourcentage, priority, codeInterne, plafond,
                    companyId, plafondEncours, isAbsolute, StringUtils.trimToNull(remiseId));
            if (compte != null) {
                return reponseTransaction(commonparameter.PROCESS_SUCCESS, "Opération effectuée avec succès");
            }
            return reponseTransaction(ocm.getMessage(), ocm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "createClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de créer le client");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_CLIENT_ID") String clientId,
            @FormParam("str_CODE_INTERNE") String codeInterne, @FormParam("str_FIRST_NAME") String firstName,
            @FormParam("str_LAST_NAME") String lastName,
            @FormParam("str_NUMERO_SECURITE_SOCIAL") String numeroSecuriteSocial,
            @FormParam("dt_NAISSANCE") String dtNaissance, @FormParam("str_SEXE") String sexe,
            @FormParam("str_ADRESSE") String adresse, @FormParam("str_DOMICILE") String domicile,
            @FormParam("str_AUTRE_ADRESSE") String autreAdresse, @FormParam("str_CODE_POSTAL") String codePostal,
            @FormParam("str_COMMENTAIRE") String commentaire, @FormParam("lg_VILLE_ID") String villeId,
            @FormParam("lg_MEDECIN_ID") String medecinId,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_MENSUELLE") double quotaConsoMensuelle,
            @DefaultValue("0") @FormParam("dbl_CAUTION") double caution,
            @FormParam("lg_TYPE_CLIENT_ID") String typeClientId,
            @FormParam("lg_AYANTS_DROITS_ID") String ayantsDroitsId,
            @FormParam("lg_CATEGORIE_AYANTDROIT_ID") String categorieAyantDroitId,
            @FormParam("lg_RISQUE_ID") String risqueId, @FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("0") @FormParam("int_POURCENTAGE") int pourcentage,
            @DefaultValue("1") @FormParam("int_PRIORITY") int priority,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_VENTE") double quotaConsoVente,
            @FormParam("lg_COMPANY_ID") String companyId, @DefaultValue("0") @FormParam("dbl_PLAFOND") double plafond,
            @DefaultValue("0") @FormParam("db_PLAFOND_ENCOURS") int plafondEncours,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute,
            @FormParam("remiseId") String remiseId) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            clientManagement ocm = new clientManagement(odm, user);
            String categorie = StringUtils.isNotBlank(categorieAyantDroitId) ? categorieAyantDroitId
                    : CATEGORIE_AYANT_DROIT_DEFAUT;
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            Date naissance = StringUtils.isNotBlank(dtNaissance)
                    ? new date().stringToDate(dtNaissance, date.formatterMysqlShort) : null;
            ocm.update2(clientId, codeInterne, firstName, lastName, numeroSecuriteSocial, naissance, sexe, adresse,
                    domicile, autreAdresse, codePostal, commentaire, villeId, StringUtils.defaultString(medecinId),
                    quotaConsoMensuelle, caution, typeClientId, StringUtils.defaultString(ayantsDroitsId), categorie,
                    risque, tiersPayantId, pourcentage, priority, quotaConsoVente, companyId, (int) plafond,
                    plafondEncours, isAbsolute, StringUtils.trimToNull(remiseId));
            return reponseTransaction(ocm.getMessage(), ocm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de modifier le client");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleStatut(@FormParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @FormParam("actif") boolean actif) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            clientManagement ocm = new clientManagement(odm, user);
            // MEMES methodes metier que les modes disable/enable de la JSP historique
            ocm.enableOrDisableClient(compteClientId,
                    actif ? commonparameter.statut_enable : commonparameter.statut_disable);
            return reponseTransaction(ocm.getMessage(), ocm.getDetailmessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleStatutClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de changer le statut de ce client");
        } finally {
            odm.closeEntityManager();
        }
    }
}
