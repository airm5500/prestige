/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.Params;
import dal.RetourCarnet;
import dal.TUser;
import java.time.LocalDate;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.RetourCarnetService;
import rest.service.dto.RetourCarnetDTO;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v2/retour-carnet-depot")
@Produces("application/json")
@Consumes("application/json")
public class RetourCarnetRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private RetourCarnetService retourCarnetService;

    @GET
    @Path("list")
    public Response fetchAll(@QueryParam(value = "query") String query,
            @QueryParam(value = "tiersPayantId") String tiersPayantId, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        JSONObject json = retourCarnetService.listRetourByTierspayantIdAndPeriode(tiersPayantId, query,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd), start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("items")
    public Response fetchItem(@QueryParam(value = "retourCarnetId") Integer retourCarnetId,
            @QueryParam(value = "query") String query, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) {
        JSONObject json = retourCarnetService.findByRetourCarnetId(retourCarnetId, query, start, limit);
        return Response.ok().entity(json.toString()).build();

    }

    @DELETE
    @Path("item/{id}")
    public Response removeItem(@PathParam("id") Integer id) {
        retourCarnetService.removeDetailRetour(id);
        JSONObject json = new JSONObject().put("success", true);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("item/{id}")
    public Response modifierProduitRetour(@PathParam("id") Integer id, Params params) throws Exception {
        Integer idRetour = retourCarnetService.updateDetailRetour(params.getValue(), id);
        JSONObject json = new JSONObject().put("success", true).put("data", new JSONObject().put("id", idRetour));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("add/item")
    public Response ajusterProduit(Params params) throws Exception {

        Integer id = retourCarnetService.addDetailRetour(params.getValue(), params.getRefTwo(), params.getValueFour(),
                Integer.valueOf(params.getRefParent()));
        JSONObject json = new JSONObject().put("success", true).put("data", new JSONObject().put("id", id));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("creeation")
    public Response createRetour(Params params) throws JSONException, Exception {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        RetourCarnetDTO retourCarnetDTO = new RetourCarnetDTO();
        retourCarnetDTO.setOperateur(tu);
        retourCarnetDTO.setLibelle(params.getDescription());
        retourCarnetDTO.setTierspayantId(params.getRef());
        RetourCarnet retourCarnet = retourCarnetService.createRetourCarnet(retourCarnetDTO, params.getValue(),
                params.getValueFour(), params.getRefTwo());
        JSONObject json = new JSONObject().put("success", true).put("data",
                new JSONObject().put("id", retourCarnet.getId()));
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("{id}")
    public Response clore(@PathParam("id") Integer id, Params params) throws JSONException {
        retourCarnetService.updateRetourCarnet(id, params.getDescription());
        JSONObject json = new JSONObject().put("success", true);
        return Response.ok().entity(json.toString()).build();
    }
}
