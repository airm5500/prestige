/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.Params;
import dal.TUser;
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
import org.json.JSONObject;
import rest.service.GestionPerimesService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/gestionperime")
@Produces("application/json")
@Consumes("application/json")
public class GestionPerimesResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private GestionPerimesService gestionPerimesService;

    @POST
    @Path("add")
    public Response addPerime(Params params) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = gestionPerimesService.addPerime(params.getRef(), params.getValue(), params.getRefTwo(),
                params.getRefParent(), tu);
        return Response.ok(json.toString()).build();
    }

    @POST
    @Path("update")
    public Response update(Params params) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setOperateur(tu);
        JSONObject json = gestionPerimesService.updatePerime(params);
        return Response.ok(json.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response remove(@PathParam("id") String id) {
        gestionPerimesService.removePerime(id);
        return Response.ok().build();
    }

    @PUT
    @Path("close/{id}")
    public Response completePerimes(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = gestionPerimesService.completePerimes(id, tu);
        return Response.ok(json.toString()).build();
    }

    @GET
    @Path("saisie-encours")
    public Response getPerimesSaisiEnCours(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) {
        JSONObject json = gestionPerimesService.getPerimesSaisiEnCours(start, limit);
        return Response.ok().entity(json.toString()).build();
    }
}
