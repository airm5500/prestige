/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.ReglementCarnetDTO;
import dal.TUser;
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
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.TiersPayantExclusService;
import toolkits.parameters.commonparameter;

/**
 *
 * @author koben
 */
@Path("v2/tiers-payant")
@Produces("application/json")
@Consumes("application/json")
public class TiersPayantExclusRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private TiersPayantExclusService tiersPayantExclusService;

    @GET
    @Path("list")
    public Response fetchAll(@QueryParam(value = "query") String query, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) {
        JSONObject json = tiersPayantExclusService.allTiersPayant(start, limit, query);
        return Response.ok().entity(json.toString()).build();

    }

    @POST
    @Path("exclure")
    public Response exclure(GenererFactureDTO datas) throws JSONException {
        tiersPayantExclusService.exclure(datas);
        return Response.ok().build();
    }

    @PUT
    @Path("exclure-inclure/{id}/{toExclude}")
    public Response exclureOrInclureById(@PathParam("id") String id, @PathParam("toExclude") boolean toExclude) {
        tiersPayantExclusService.update(id, toExclude);
        return Response.ok().build();
    }

    @GET
    @Path("list-exclus")
    public Response fetchExclud(@QueryParam(value = "query") String query, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) {
        JSONObject json = tiersPayantExclusService.all(start, limit, query);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("ventes")
    public Response fetchVenteByTiersPayant(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        JSONObject json = tiersPayantExclusService.fetchVenteByTiersPayant(tiersPayantId, dtStart, dtEnd, start, limit);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("reglements")
    public Response reglementsCarnet(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        JSONObject json = tiersPayantExclusService.reglementsCarnet(tiersPayantId, null, dtStart, dtEnd, start, limit);
        return Response.ok().entity(json.toString()).build();

    }

    @PUT
    @Path("regler/{tiersPayantId}")
    public Response exclureOrInclureById(@PathParam("tiersPayantId") String id, ReglementCarnetDTO o) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        JSONObject json = tiersPayantExclusService.faireReglement(o.setTiersPayantId(id), tu);
        return Response.ok().entity(json.toString()).build();
    }
}
