/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.ClientLambdaDTO;
import commonTasks.dto.TiersPayantDTO;
import commonTasks.dto.TiersPayantParams;
import dal.TClient;
import dal.TUser;
import java.io.IOException;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
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
import rest.service.ClientService;
import util.Constant;

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
}
