/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.QueryDTO;
import commonTasks.dto.SalesParams;
import dal.TPreenregistrement;
import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.GenerateTicketService;
import rest.service.SalesService;
import toolkits.parameters.commonparameter;
import util.DateConverter;
import util.Constant;

/**
 *
 * @author Kobena
 */
@Path("v2/vente")
@Produces("application/json")
@Consumes("application/json")
public class VenteRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    SalesService salesService;
    @EJB
    GenerateTicketService generateTicketService;

    @POST
    @Path("ticket/vno")
    public Response getTicket(ClotureVenteParams clotureVenteParams) throws JSONException {
        JSONObject json = generateTicketService.lunchPrinterForTicket(clotureVenteParams);
        return Response.ok().entity(json).build();
    }

    @POST
    @Path("ticket/vo")
    public Response getTicketVo(ClotureVenteParams clotureVenteParams) throws JSONException {
        JSONObject json = generateTicketService.lunchPrinterForTicketVo(clotureVenteParams);
        return Response.ok().entity(json).build();
    }

    @POST
    @Path("add/vno")
    public Response addVente(SalesParams params) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setUserId(tu);
        params.setStatut(params.isPrevente() ? DateConverter.STATUT_PENDING : DateConverter.STATUT_PROCESS);
        JSONObject json = salesService.createPreVente(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("add/assurance")
    public Response addVenteAssurance(SalesParams params) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setUserId(tu);
        params.setStatut(params.isPrevente() ? DateConverter.STATUT_PENDING : DateConverter.STATUT_PROCESS);
        JSONObject json = salesService.createPreVenteVo(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("devis")
    public Response addDevis(SalesParams params) {
        JSONObject json = new JSONObject();
        try {
            HttpSession hs = servletRequest.getSession();
            TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
            if (tu == null) {
                return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
            }
            params.setUserId(tu);
            params.setDevis(true);
            params.setStatut(commonparameter.statut_is_Devis);
            json = salesService.faireDevis(params);

        } catch (JSONException ex) {

        }
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("remise")
    public Response addRemise(SalesParams params) {
        JSONObject json = new JSONObject();
        try {
            json = salesService.addRemise(params);

        } catch (JSONException ex) {

        }
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("cloturer/vno")
    public Response cloturerVno(ClotureVenteParams clotureVenteParams) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        clotureVenteParams.setUserId(tu);
        JSONObject json = salesService.updateVenteClotureComptant(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("net/vno")
    public Response netPayer(SalesParams params) throws JSONException {
        JSONObject json = salesService.shownetpayVno(params);

        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("net/assurance")
    public Response netPayerAssurance(SalesParams params) throws JSONException {

        return Response.ok().entity(salesService.computeVONet(params).toString()).build();
    }

    @POST
    @Path("cloturer/assurance")
    public Response cloturerAssurance(ClotureVenteParams clotureVenteParams) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        clotureVenteParams.setUserId(tu);
        JSONObject json = salesService.updateVenteClotureAssurance(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("clotureravoir/{id}")
    public Response clotureravoir(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        JSONObject json = salesService.clotureravoir(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("updatetypevente")
    public Response updatetypevente(SalesParams params) {
        JSONObject json = salesService.transformerVente(params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("removetp/{compteClientId}/{venteId}")
    public Response removetp(@PathParam("compteClientId") String compteClientId, @PathParam("venteId") String venteId) {
        JSONObject jsono = salesService.removetierspayant(compteClientId, venteId);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("addtp/{venteId}")
    public Response addtp(@PathParam("venteId") String venteId, SalesParams params) {
        JSONObject jsono = salesService.addtierspayant(venteId, params);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("annulation/{id}")
    public Response deleteVente(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = salesService.annulerVente(tu, id);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("search/{id}")
    public Response searchProductById(@PathParam("id") String id) throws JSONException {

        JSONObject jsono = salesService.produits(id);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("search")
    public Response searchProduct(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) throws JSONException {

        QueryDTO body = new QueryDTO();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);

        JSONObject jsono = salesService.produits(body, false);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("deatails")
    public Response getDetails(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "venteId") String venteId,
            @QueryParam(value = "statut") String statut) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        QueryDTO body = new QueryDTO();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        body.setVenteId(venteId);
        body.setEmplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        JSONObject jsono = salesService.detailsVente(body, false);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("add/item")
    public Response addItemVente(SalesParams params) {
        JSONObject json = salesService.addPreenregistrementItem(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("remove/vno/item/{id}")
    public Response removeItemVente(@PathParam("id") String itemId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        TPreenregistrement tp = salesService.removePreenregistrementDetail(itemId);
        JSONObject json = salesService.shownetpayVno(tp);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("update/item/vno")
    public Response updateItemVente(SalesParams params) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setUserId(tu);
        JSONObject json = salesService.updateTPreenregistrementDetail(params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("quantite-vente/{id}")
    public Response nobreproduits(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = new JSONObject();
        jsono.put("success", true).put("data", salesService.nbreProduitsByVente(id));
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("add/depot")
    public Response addVenteDepot(SalesParams params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setUserId(tu);
        params.setDepot(true);
        params.setTypeVenteId((params.getTypeDepoId().equals("1") ? "4" : "5"));
        params.setStatut(commonparameter.statut_is_Process);
        JSONObject json = salesService.createPreVenteVo(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("remise-depot")
    public Response addRemiseDepot(SalesParams params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = salesService.updatRemiseVenteDepot(params.getVenteId(), params.getRemiseDepot());
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("clotureVenteDepot")
    public Response clotureVenteDepot(ClotureVenteParams clotureVenteParams) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        clotureVenteParams.setUserId(tu);
        JSONObject json = salesService.clotureVenteDepot(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("clotureVenteDepotAgree")
    public Response clotureVenteDepotAgree(ClotureVenteParams clotureVenteParams) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        clotureVenteParams.setUserId(tu);
        JSONObject json = salesService.clotureVenteDepotAgree(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("cheick-caisse")
    public Response checkCaisse() throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = new JSONObject();
        boolean b = salesService.checkCaisse(tu);
        json.put("success", true).put("data", b);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("shownetpaydepotAgree")
    public Response shownetpaydepotAgree(SalesParams params) throws JSONException {
        JSONObject json = salesService.shownetpaydepotAgree(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("update/client")
    public Response updateVenteClient(SalesParams params) throws JSONException {
        JSONObject json = salesService.updateclient(params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("findone/{id}")
    public Response findByQuery(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = salesService.findOneproduit(id, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(jsono.toString()).build();
    }
}
