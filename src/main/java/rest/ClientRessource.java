/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import bll.configManagement.clientManagement;
import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.ClientLambdaDTO;
import commonTasks.dto.TiersPayantDTO;
import commonTasks.dto.TiersPayantParams;
import dal.TClient;
import dal.TCompteClient;
import dal.TPrivilege;
import dal.TUser;
import dal.dataManager;
import java.io.IOException;
import java.util.Date;
import java.util.List;
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
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.ClientConsommationService;
import rest.service.ClientService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
@Path("v1/client")
@Produces("application/json")
@Consumes("application/json")
public class ClientRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ClientService clientService;
    @EJB
    private ExportExcelUtilService exportExcelUtilService;
    @EJB
    private ClientConsommationService clientConsommationService;

    @GET
    @Path("consommation")
    public Response consommation(@QueryParam(value = "clientId") String clientId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "query") String query, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = clientConsommationService.consommation(clientId, dtStart, dtEnd, query, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("consommation/globale")
    public Response consommationGlobale(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "query") String query,
            @QueryParam(value = "habitude") String habitude, @QueryParam(value = "typeClient") String typeClient,
            @QueryParam(value = "sortBy") String sortBy, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = clientConsommationService.fetchClients(dtStart, dtEnd, query, habitude, typeClient, sortBy,
                start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("consommation/globale/csv")
    @Produces("text/csv")
    public Response consommationGlobaleCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "query") String query,
            @QueryParam(value = "habitude") String habitude, @QueryParam(value = "typeClient") String typeClient,
            @QueryParam(value = "sortBy") String sortBy) throws Exception {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = clientConsommationService.exportClientsCsv(dtStart, dtEnd, query, habitude, typeClient, sortBy);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"suivi_conso_clients.csv\"")
                .build();
    }

    @GET
    @Path("consommation/globale/excel")
    @Produces("application/vnd.ms-excel")
    public Response consommationGlobaleExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "query") String query,
            @QueryParam(value = "habitude") String habitude, @QueryParam(value = "typeClient") String typeClient,
            @QueryParam(value = "sortBy") String sortBy) throws Exception {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = clientConsommationService.exportClientsExcel(dtStart, dtEnd, query, habitude, typeClient, sortBy);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"suivi_conso_clients.xls\"")
                .build();
    }

    @GET
    @Path("consommation/globale/pdf")
    public Response consommationGlobalePdf(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "query") String query,
            @QueryParam(value = "habitude") String habitude, @QueryParam(value = "typeClient") String typeClient,
            @QueryParam(value = "sortBy") String sortBy) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String file = clientConsommationService.printClients(tu, dtStart, dtEnd, query, habitude, typeClient, sortBy);
        return Response.status(Response.Status.FOUND)
                .location(java.net.URI.create(servletRequest.getContextPath() + file)).build();
    }

    @GET
    @Path("consommation/pdf")
    public Response consommationClientPdf(@QueryParam(value = "clientId") String clientId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String file = clientConsommationService.printClient(tu, clientId, dtStart, dtEnd);
        return Response.status(Response.Status.FOUND)
                .location(java.net.URI.create(servletRequest.getContextPath() + file)).build();
    }

    @GET
    @Path("lambda")
    public Response getUsers(@QueryParam(value = "query") String query) {
        List<ClientLambdaDTO> data = clientService.findClientLambda(query);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("delayed")
    public Response clientDifferes(@QueryParam(value = "query") String query) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<ClientDTO> data = clientService.clientDifferes(query, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("differes")
    public Response differes(@QueryParam(value = "query") String query) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<ClientDTO> data = clientService.clientDiffere(query, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("add/lambda")
    public Response add(ClientLambdaDTO clientLambda) {

        TClient tc = clientService.createClient(clientLambda);
        return Response.ok().entity(ResultFactory.getSuccessResult(new ClientLambdaDTO(tc), 1)).build();
    }

    @PUT
    @Path("add/venteclientinfos/{id}")
    public Response updateVenteInfosClient(@PathParam("id") String id, ClientLambdaDTO clientLambda) {

        JSONObject json = clientService.createClient(clientLambda, id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("all")
    public Response findAllClients(@QueryParam(value = "query") String query,
            @QueryParam(value = "typeClientId") String typeClientId) {
        List<ClientDTO> data = clientService.findClientAssurance(query, typeClientId);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("list")
    public Response fetchClients(@QueryParam(value = "query") String query,
            @QueryParam(value = "typeClientId") String typeClientId, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limi) {
        JSONObject data = clientService.fetchClients(query, typeClientId, start, limi);
        return Response.ok().entity(data.toString()).build();
    }

    @GET
    @Path("bytype/{type}")
    public Response findAllClients(@QueryParam(value = "query") String query, @PathParam("type") String id,
            String typeClientId) {
        List<ClientDTO> data = clientService.findClientAssurance(query, typeClientId);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("tiers-payants")
    public Response findAllTiersPayants(@QueryParam(value = "typetierspayant") String typeTierpayant,
            @QueryParam(value = "query") String query) {
        List<TiersPayantDTO> data = clientService.findTiersPayants(query, typeTierpayant);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("tiers-payants/carnet")
    public Response findAllTiersPayantsCarnet(@QueryParam(value = "query") String query) {
        List<TiersPayantDTO> data = clientService.findTiersPayants(query, "2");
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("tiers-payants/assurance")
    public Response findAllTiersPayantsassurance(@QueryParam(value = "query") String query) {
        List<TiersPayantDTO> data = clientService.findTiersPayants(query, "1");
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("tiers-payants-associes-include")
    public Response findAllTiersPayantsByClientId(@QueryParam(value = "clientId") String clientId) {
        List<TiersPayantParams> data = clientService.findTiersPayantByClientId(clientId);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("tiers-payants-associes")
    public Response findTiersPayantByClientIdExcludeRo(@QueryParam(value = "clientId") String clientId) {
        List<TiersPayantParams> data = clientService.findTiersPayantByClientIdExcludeRo(clientId);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("add/carnet")
    public Response addclientCarnet(ClientDTO client) throws JSONException {

        JSONObject json = clientService.updateCreateClientCarnet(client);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("add/assurance")
    public Response addclientAssurance(ClientDTO client) throws JSONException {

        JSONObject json = clientService.updateOrCreateClientAssurance(client);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("ayant-droits")
    public Response ayantDroits(@QueryParam(value = "query") String query,
            @QueryParam(value = "clientId") String clientId) {
        List<AyantDroitDTO> data = clientService.findAyantDroitByClientId(clientId, query);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("ayant-droits/{id}")
    public Response addAyantDroits(@PathParam("id") String id, AyantDroitDTO ayantDroitDTO) throws JSONException {
        ayantDroitDTO.setLgCLIENTID(id);
        JSONObject json = clientService.addAyantDroitToClient(ayantDroitDTO);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("client-assurance/{id}/{venteId}")
    public Response findClientById(@PathParam("id") String id, @PathParam("venteId") String venteId)
            throws JSONException {
        JSONObject json = clientService.findClientAssuranceById(id, venteId);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("tiers-payants/{id}")
    public Response findTiersPayants(@PathParam("id") String typeTierpayant,
            @QueryParam(value = "query") String query) {
        List<TiersPayantDTO> data = clientService.findTiersPayants(query, typeTierpayant);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("tierspayantsbytype/{type}")
    public Response findByType(@PathParam("type") String type, @QueryParam(value = "query") String query) {
        List<TiersPayantDTO> data = clientService.findTiersPayants(query, type);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("add-tierspayant/{clientId}/{typetierspayantId}/{taux}")
    public Response addNewTiersPayantToClient(TiersPayantDTO tiersPayantDTO, @PathParam("clientId") String clientId,
            @PathParam("typetierspayantId") String typeTiersPayantId, @PathParam("taux") int taux)
            throws JSONException {

        JSONObject json = clientService.addNewTiersPayantToClient(tiersPayantDTO, clientId, typeTiersPayantId, taux);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("update-infos-client/{clientId}")
    public Response updateClientInfos(ClientDTO clientDTO, @PathParam("clientId") String clientId)
            throws JSONException {

        JSONObject json = clientService.updateClientInfos(clientDTO, clientId);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("update-infos-ayantdroit/{ayantDroitId}")
    public Response updateAyantDroitInfos(AyantDroitDTO ayantDroitDTO, @PathParam("ayantDroitId") String ayantDroitId)
            throws JSONException {

        ayantDroitDTO.setLgAYANTSDROITSID(ayantDroitId);
        JSONObject json = clientService.updateAyantDroitInfos(ayantDroitDTO);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("ventes-tierspayant")
    public Response ventesTiersPayants(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "tiersPayantId") String tiersPayantId, @QueryParam(value = "groupeId") String groupeId,
            @QueryParam(value = "typeTp") String typeTp, @QueryParam(value = "query") String query) {
        JSONObject json = clientService.ventesTiersPayants(query, dtStart, dtEnd, tiersPayantId, groupeId, typeTp,
                start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("export-vente-excel")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToExecel(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "tiersPayantId") String tiersPayantId, @QueryParam(value = "groupeId") String groupeId,
            @QueryParam(value = "typeTp") String typeTp, @QueryParam(value = "query") String query,
            @QueryParam(value = "isGroupe") boolean isGroupe) throws IOException {

        return this.exportExcelUtilService.exportToExecel(
                clientService.generate(isGroupe, query, dtStart, dtEnd, tiersPayantId, groupeId, typeTp),
                "bordereaux_");
        /*
         * StreamingOutput output = (OutputStream out) -> { try {
         *
         * out.write(clientService.generate(isGroupe, query, dtStart, dtEnd, tiersPayantId, groupeId, typeTp));
         * out.flush();
         *
         * } catch (IOException ex) { throw new WebApplicationException("File Not Found !!"); } }; String filename =
         * "bordereaux_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
         * return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM) .header("content-disposition",
         * "attachment; filename = " + filename).build(); }
         */
    }

    // =============================================================================================
    // Ecran Gestion des Clients (remplace webservices/configmanagement/client/ws_data.jsp et
    // ws_transaction.jsp). La CONSULTATION passe par une requete groupee par page ; la CREATION,
    // la MODIFICATION et la DESACTIVATION deleguent aux MEMES methodes metier bll.clientManagement
    // que la JSP historique (createClient / update2 / enableOrDisableClient) : memes regles, memes
    // messages, zero changement de comportement.
    // =============================================================================================

    private static final Logger LOG_GESTION = Logger.getLogger(ClientRessource.class.getName());
    /** Valeurs par defaut historiques de ws_transaction.jsp. */
    private static final String CATEGORIE_AYANT_DROIT_DEFAUT = "555146116095894790";
    private static final String RISQUE_DEFAUT = "55181642844215217016";

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private List<TPrivilege> privilegesSession() {
        return (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    }

    private Response reponseDeconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    private Response reponseTransaction(String success, String errors) {
        return Response.ok().entity(new JSONObject().put("success", success)
                .put("errors", org.apache.commons.lang3.StringUtils.defaultString(errors)).put("total_differe", 0)
                .put("isCustSolvable", 0).put("results", new org.json.JSONArray().put(new JSONObject())).toString())
                .build();
    }

    @GET
    @Path("gestion")
    public Response listeGestion(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @QueryParam("lg_TYPE_CLIENT_ID") String typeClientId,
            @DefaultValue("true") @QueryParam("actifs") boolean actifs,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = utilisateurSession();
        if (user == null) {
            return reponseDeconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        List<TPrivilege> privileges = privilegesSession();
        boolean btnDelete = CommonUtils.hasAuthorityById(privileges, DateConverter.ACTIONDELETE);
        boolean btnDesactiver = CommonUtils.hasAuthorityByName(privileges, DateConverter.P_BTN_DESACTIVER_CLIENT);
        return Response
                .ok().entity(clientService
                        .listClients(search, typeClientId, actifs, btnDelete, btnDesactiver, start, limit).toString())
                .build();
    }

    @POST
    @Path("gestion/create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response creerGestion(@FormParam("str_FIRST_NAME") String firstName,
            @FormParam("str_LAST_NAME") String lastName,
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
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            clientManagement ocm = new clientManagement(odm, user);
            // Regles historiques de ws_transaction.jsp (mode=create)
            String typeClient = org.apache.commons.lang3.StringUtils.defaultString(typeClientId);
            if ("1".equals(typeTiersPayantId) || "2".equals(typeTiersPayantId)) {
                typeClient = typeTiersPayantId;
            }
            String categorie = org.apache.commons.lang3.StringUtils.isNotBlank(categorieAyantDroitId)
                    ? categorieAyantDroitId : CATEGORIE_AYANT_DROIT_DEFAUT;
            String risque = org.apache.commons.lang3.StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            Date naissance = org.apache.commons.lang3.StringUtils.isNotBlank(dtNaissance)
                    ? new toolkits.utils.date().stringToDate(dtNaissance, toolkits.utils.date.formatterMysqlShort)
                    : null;
            // MEME appel que la JSP historique : dbl_PLAFOND est bien passe dans le meme emplacement d'argument
            TCompteClient compte = ocm.createClient(firstName, lastName, numeroSecuriteSocial, naissance, sexe, adresse,
                    domicile, autreAdresse, codePostal, commentaire, villeId, quotaConsoMensuelle, caution, solde,
                    typeClient, categorie, risque, tiersPayantId, pourcentage, priority, codeInterne, plafond,
                    companyId, plafondEncours, isAbsolute, org.apache.commons.lang3.StringUtils.trimToNull(remiseId));
            if (compte != null) {
                return reponseTransaction(commonparameter.PROCESS_SUCCESS, "Opération effectuée avec succès");
            }
            return reponseTransaction(ocm.getMessage(), ocm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "createClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de créer le client");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("gestion/update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response modifierGestion(@FormParam("lg_CLIENT_ID") String clientId,
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
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            clientManagement ocm = new clientManagement(odm, user);
            String categorie = org.apache.commons.lang3.StringUtils.isNotBlank(categorieAyantDroitId)
                    ? categorieAyantDroitId : CATEGORIE_AYANT_DROIT_DEFAUT;
            String risque = org.apache.commons.lang3.StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            Date naissance = org.apache.commons.lang3.StringUtils.isNotBlank(dtNaissance)
                    ? new toolkits.utils.date().stringToDate(dtNaissance, toolkits.utils.date.formatterMysqlShort)
                    : null;
            ocm.update2(clientId, codeInterne, firstName, lastName, numeroSecuriteSocial, naissance, sexe, adresse,
                    domicile, autreAdresse, codePostal, commentaire, villeId,
                    org.apache.commons.lang3.StringUtils.defaultString(medecinId), quotaConsoMensuelle, caution,
                    typeClientId, org.apache.commons.lang3.StringUtils.defaultString(ayantsDroitsId), categorie, risque,
                    tiersPayantId, pourcentage, priority, quotaConsoVente, companyId, (int) plafond, plafondEncours,
                    isAbsolute, org.apache.commons.lang3.StringUtils.trimToNull(remiseId));
            return reponseTransaction(ocm.getMessage(), ocm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "updateClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de modifier le client");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Suppression d'un client : MEME methode metier bll.clientManagement.delete que la JSP historique
     * (client/ws_transaction.jsp mode=delete), memes refus (client ayant deja realise des actions). Contrairement a la
     * JSP, aucune recherche de tiers payant associe n'est faite apres coup : cet epilogue provoquait une
     * NoResultException et le message trompeur "Le tiers payant n'est pas associe au client en cours" alors que la
     * suppression avait reussi.
     */
    @POST
    @Path("gestion/delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response supprimerGestion(@FormParam("lg_CLIENT_ID") String clientId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            clientManagement ocm = new clientManagement(odm, user);
            ocm.delete(org.apache.commons.lang3.StringUtils.defaultString(clientId));
            return reponseTransaction(ocm.getMessage(), ocm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "deleteClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de supprimer ce client");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Tiers payants d'un client (vue Gestion des tiers payants du client) : memes cles JSON et memes regles que la JSP
     * historique webservices/configmanagement/compteclienttierspayant/ws_data.jsp, y compris le privilege BTNDELETE —
     * mais avec une garde : la JSP plantait en NullPointerException quand le privilege ne pouvait pas etre evalue.
     */
    @GET
    @Path("gestion/tiers-payants")
    public Response listeTiersPayantsClient(@QueryParam("search_value") String searchValue,
            @QueryParam("query") String query, @QueryParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue
                    : org.apache.commons.lang3.StringUtils.defaultString(query);
            String compte = org.apache.commons.lang3.StringUtils.isNotBlank(compteClientId) ? compteClientId : "%%";
            String tp = org.apache.commons.lang3.StringUtils.isNotBlank(tiersPayantId) ? tiersPayantId : "%%";
            boolean btnDelete = false;
            try {
                btnDelete = new bll.userManagement.privilege(odm, user)
                        .isColonneStockMachineIsAuthorize(bll.common.Parameter.P_BT_DELETE);
            } catch (Exception e) {
                LOG_GESTION.log(java.util.logging.Level.WARNING, "privilege P_BT_DELETE indisponible", e);
            }
            List<dal.TCompteClientTiersPayant> liste = new clientManagement(odm).getTiersPayantsByClient(search, compte,
                    tp);
            org.json.JSONArray results = new org.json.JSONArray();
            int fin = limit > 0 ? Math.min(liste.size(), Math.max(0, start) + limit) : liste.size();
            for (int i = Math.max(0, start); i < fin; i++) {
                dal.TCompteClientTiersPayant t = liste.get(i);
                JSONObject json = new JSONObject();
                json.put("str_FIRST_NAME", t.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME());
                json.put("str_LAST_NAME", t.getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME());
                json.put("lg_COMPTE_CLIENT_TIERS_PAYANT_ID", t.getLgCOMPTECLIENTTIERSPAYANTID());
                json.put("lg_TIERS_PAYANT_ID", t.getLgTIERSPAYANTID().getStrFULLNAME());
                json.put("str_TIERS_PAYANT_NAME", t.getLgTIERSPAYANTID().getStrFULLNAME());
                json.put("lg_COMPTE_CLIENT_ID", t.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID());
                json.put("lg_CLIENT_ID", t.getLgCOMPTECLIENTID().getLgCLIENTID().getLgCLIENTID());
                json.put("int_POURCENTAGE", t.getIntPOURCENTAGE());
                json.put("int_PRIORITY", t.getIntPRIORITY());
                json.put("dbl_PLAFOND", t.getDblPLAFOND());
                json.put("db_PLAFOND_ENCOURS", t.getDbPLAFONDENCOURS());
                json.put("dbl_QUOTA_CONSO_MENSUELLE", t.getDblQUOTACONSOMENSUELLE());
                json.put("dbl_QUOTA_CONSO_VENTE", t.getDblQUOTACONSOVENTE());
                json.put("b_IsAbsolute", t.getBIsAbsolute());
                json.put("b_CANBEUSE", t.getBCANBEUSE());
                json.put("db_CONSOMMATION_MENSUELLE",
                        t.getDbCONSOMMATIONMENSUELLE() != null ? t.getDbCONSOMMATIONMENSUELLE() : 0);
                json.put("str_NUMERO_SECURITE_SOCIAL",
                        t.getStrNUMEROSECURITESOCIAL() != null ? t.getStrNUMEROSECURITESOCIAL() : "");
                json.put("BTNDELETE", btnDelete);
                json.put("str_REGIME", t.getIntPRIORITY() == 1 ? "RO" : "RC" + (t.getIntPRIORITY() - 1));
                json.put("dt_CREATED",
                        toolkits.utils.date.DateToString(t.getDtCREATED(), toolkits.utils.date.formatterShort));
                results.put(json);
            }
            return Response.ok().entity(new JSONObject().put("total", liste.size()).put("results", results).toString())
                    .build();
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "tiers payants du client", e);
            return Response.ok()
                    .entity(new JSONObject().put("total", 0).put("results", new org.json.JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Ventes du client (vue Détails ventes) : MEMES methodes metier et MEMES cles JSON que la JSP historique
     * webservices/configmanagement/client/ws_vente.jsp, y compris le repli sur les ventes directes du client standard
     * quand aucune ligne tiers payant n'existe. Reponse {total, data} comme la JSP.
     */
    @GET
    @Path("gestion/ventes")
    public Response ventesClient(@QueryParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @QueryParam("dt_start_vente") String dtStart, @QueryParam("dt_end_vente") String dtEnd,
            @QueryParam("tierpayantClient") String tierPayantClient, @QueryParam("search_value") String searchValue,
            @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("10") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            clientManagement m = new clientManagement(odm);
            String jour = toolkits.utils.date.formatterMysqlShort.format(new Date());
            String debut = org.apache.commons.lang3.StringUtils.isNotBlank(dtStart) ? dtStart : jour;
            String fin = org.apache.commons.lang3.StringUtils.isNotBlank(dtEnd) ? dtEnd : jour;
            String tp = org.apache.commons.lang3.StringUtils.isNotBlank(tierPayantClient) ? tierPayantClient : "%%";
            String search = org.apache.commons.lang3.StringUtils.isNotBlank(searchValue) ? searchValue
                    : (org.apache.commons.lang3.StringUtils.isNotBlank(query) ? query : "%%");
            String compte = org.apache.commons.lang3.StringUtils.defaultString(compteClientId);

            long count = m.getClientAchatsCount(compte.trim(), debut, fin, tp, search);
            List<dal.TPreenregistrementCompteClientTiersPayent> lignes = m.getClientAchats(compte, debut, fin, tp,
                    search, start, limit);
            JSONObject totaux = m.getClientAchats(compte, debut, fin, tp, search);

            org.json.JSONArray data = new org.json.JSONArray();
            for (dal.TPreenregistrementCompteClientTiersPayent o : lignes) {
                JSONObject json = new JSONObject();
                json.put("REFVENTE", o.getLgPREENREGISTREMENTID().getStrREF());
                json.put("IDVENTE", o.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID());
                json.put("DATEVENTE",
                        toolkits.utils.date.formatterShort.format(o.getLgPREENREGISTREMENTID().getDtUPDATED()));
                json.put("MONTANTVENTE",
                        toolkits.utils.conversion.AmountFormat(o.getLgPREENREGISTREMENTID().getIntPRICE()));
                json.put("MONTANTCLIENT", o.getLgPREENREGISTREMENTID().getIntCUSTPART());
                json.put("MONTANTTP", o.getIntPRICE());
                json.put("POURCENTAGE", o.getIntPERCENT());
                json.put("REFFACTURE", m.getFatucreRef(o.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID()));
                json.put("TIERSPAYANT", o.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME());
                json.put("REFBON", o.getStrREFBON());
                json.put("TOTALVENTE", totaux.get("TOTALVENTE"));
                json.put("TOTALCLIENT", totaux.get("TOTALCLIENT"));
                json.put("TOTALTTP", totaux.get("TOTALTP"));
                data.put(json);
            }

            // Clients standards : aucune ligne tiers payant -> ventes reliees directement au client
            if (count == 0) {
                count = m.getClientVentesStandardsCount(compte.trim(), debut, fin, search);
                if (count > 0) {
                    List<dal.TPreenregistrement> ventes = m.getClientVentesStandards(compte, debut, fin, search, start,
                            limit);
                    JSONObject totauxStandards = m.getClientVentesStandardsTotaux(compte, debut, fin, search);
                    for (dal.TPreenregistrement vente : ventes) {
                        JSONObject json = new JSONObject();
                        json.put("REFVENTE", vente.getStrREF());
                        json.put("IDVENTE", vente.getLgPREENREGISTREMENTID());
                        json.put("DATEVENTE", toolkits.utils.date.formatterShort.format(vente.getDtUPDATED()));
                        json.put("MONTANTVENTE", toolkits.utils.conversion.AmountFormat(vente.getIntPRICE()));
                        json.put("MONTANTCLIENT", vente.getIntPRICE());
                        json.put("MONTANTTP", 0);
                        json.put("POURCENTAGE", 0);
                        json.put("REFFACTURE", "");
                        json.put("TIERSPAYANT", "");
                        json.put("REFBON", "");
                        json.put("TOTALVENTE", totauxStandards.get("TOTALVENTE"));
                        json.put("TOTALCLIENT", totauxStandards.get("TOTALCLIENT"));
                        json.put("TOTALTTP", totauxStandards.get("TOTALTP"));
                        data.put(json);
                    }
                }
            }
            return Response.ok().entity(new JSONObject().put("data", data).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "ventesClient", e);
            return Response.ok()
                    .entity(new JSONObject().put("data", new org.json.JSONArray()).put("total", 0).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Tiers payants d'un client pour le filtre de la vue Détails ventes : MEMES cles JSON que la JSP historique
     * ws_clientTierspayant.jsp (reponse {total, data}).
     */
    @GET
    @Path("gestion/tiers-payants-liste")
    public Response tiersPayantsListeClient(@QueryParam("lg_COMPTE_CLIENT_ID") String compteClientId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            clientManagement m = new clientManagement(odm);
            org.json.JSONArray data = new org.json.JSONArray();
            List<dal.TTiersPayant> liste = m
                    .getClientTiersPayants(org.apache.commons.lang3.StringUtils.defaultString(compteClientId));
            for (dal.TTiersPayant t : liste) {
                data.put(new JSONObject().put("lg_TIERS_PAYANT_ID", t.getLgTIERSPAYANTID()).put("str_TIERS_PAYANT_NAME",
                        t.getStrFULLNAME()));
            }
            return Response.ok().entity(new JSONObject().put("data", data).put("total", liste.size()).toString())
                    .build();
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "tiersPayantsListeClient", e);
            return Response.ok()
                    .entity(new JSONObject().put("data", new org.json.JSONArray()).put("total", 0).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    private Response reponseSimple(String success, String errors) {
        return Response.ok().entity(new JSONObject().put("success", success)
                .put("errors", org.apache.commons.lang3.StringUtils.defaultString(errors)).toString()).build();
    }

    /** Ajout d'un tiers payant au client : MEME methode metier que la JSP ws_transaction_clt.jsp (mode=create). */
    @POST
    @Path("gestion/tiers-payants/create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response creerTiersPayantClient(@FormParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("0") @FormParam("int_POURCENTAGE") int pourcentage,
            @DefaultValue("1") @FormParam("int_PRIORITY") int priority,
            @DefaultValue("0") @FormParam("dbl_PLAFOND") int plafond,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_VENTE") double quotaConsoVente,
            @DefaultValue("") @FormParam("str_NUMERO_SECURITE_SOCIAL") String numeroSecuriteSocial,
            @DefaultValue("0") @FormParam("db_PLAFOND_ENCOURS") int plafondEncours,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            bll.tierspayantManagement.tierspayantManagement otm = new bll.tierspayantManagement.tierspayantManagement(
                    odm);
            otm.create_compteclt_tierspayant(compteClientId, tiersPayantId, pourcentage, priority, plafond,
                    quotaConsoVente, numeroSecuriteSocial, plafondEncours, isAbsolute);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "creerTiersPayantClient", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible d'ajouter le tiers payant au client");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Ajout d'un tiers payant a un client standard : MEME methode metier que la JSP (mode=createstandartdclient). */
    @POST
    @Path("gestion/tiers-payants/create-standard")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response creerTiersPayantClientStandard(@FormParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("0") @FormParam("int_POURCENTAGE") int pourcentage,
            @DefaultValue("1") @FormParam("int_PRIORITY") int priority,
            @DefaultValue("") @FormParam("lg_TYPE_CLIENT_ID") String typeClientId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            bll.tierspayantManagement.tierspayantManagement otm = new bll.tierspayantManagement.tierspayantManagement(
                    odm);
            otm.createCompteClientTiersPayant(compteClientId, tiersPayantId, pourcentage, priority, typeClientId);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "creerTiersPayantClientStandard", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible d'ajouter le tiers payant au client");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Modification d'un tiers payant du client : MEME methode metier que la JSP (mode=update). */
    @POST
    @Path("gestion/tiers-payants/update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response modifierTiersPayantClient(
            @FormParam("lg_COMPTE_CLIENT_TIERS_PAYANT_ID") String compteClientTiersPayantId,
            @FormParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("0") @FormParam("int_POURCENTAGE") int pourcentage,
            @DefaultValue("1") @FormParam("int_PRIORITY") int priority,
            @DefaultValue("0") @FormParam("dbl_PLAFOND") int plafond,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_VENTE") double quotaConsoVente,
            @DefaultValue("") @FormParam("str_NUMERO_SECURITE_SOCIAL") String numeroSecuriteSocial,
            @DefaultValue("0") @FormParam("db_PLAFOND_ENCOURS") int plafondEncours,
            @DefaultValue("false") @FormParam("modeupdate") boolean modeUpdate,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            bll.tierspayantManagement.tierspayantManagement otm = new bll.tierspayantManagement.tierspayantManagement(
                    odm);
            otm.updateComptecltTierspayant(compteClientTiersPayantId, compteClientId, tiersPayantId, pourcentage,
                    priority, plafond, quotaConsoVente, numeroSecuriteSocial, plafondEncours, modeUpdate, isAbsolute);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "modifierTiersPayantClient", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de modifier le tiers payant du client");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Retrait d'un tiers payant du client : MEME methode metier que la JSP (mode=delete). */
    @POST
    @Path("gestion/tiers-payants/delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response supprimerTiersPayantClient(
            @FormParam("lg_COMPTE_CLIENT_TIERS_PAYANT_ID") String compteClientTiersPayantId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            bll.tierspayantManagement.tierspayantManagement otm = new bll.tierspayantManagement.tierspayantManagement(
                    odm);
            otm.deleteComptecltTierspayant(compteClientTiersPayantId);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "supprimerTiersPayantClient", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de retirer le tiers payant du client");
        } finally {
            odm.closeEntityManager();
        }
    }

    @POST
    @Path("gestion/toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response basculerStatutGestion(@FormParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @FormParam("actif") boolean actif) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
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
            LOG_GESTION.log(java.util.logging.Level.SEVERE, "toggleStatutClient", e);
            return reponseTransaction(commonparameter.PROCESS_FAILED, "Impossible de changer le statut de ce client");
        } finally {
            odm.closeEntityManager();
        }
    }
}
