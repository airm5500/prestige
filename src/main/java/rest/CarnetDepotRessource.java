/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.ReglementCarnetDTO;
import dal.TUser;
import dal.enumeration.TypeReglementCarnet;
import java.time.LocalDate;
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
import rest.service.CarnetAsDepotService;
import rest.service.ReglementService;
import toolkits.parameters.commonparameter;

/**
 *
 * @author koben
 */
@Path("v2/carnet-depot")
@Produces("application/json")
@Consumes("application/json")
public class CarnetDepotRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private CarnetAsDepotService carnetAsDepotService;
    @EJB
    private ReglementService reglementService;

    @GET
    @Path("list")
    public Response fetchAll(@QueryParam(value = "query") String query, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) {
        JSONObject json = carnetAsDepotService.all(start, limit, query, null);
        return Response.ok().entity(json.toString()).build();

    }

    @POST
    @Path("exclure")
    public Response exclure(GenererFactureDTO datas) throws JSONException {
        carnetAsDepotService.setAsDepot(datas);
        return Response.ok().build();
    }

    @PUT
    @Path("exclure-inclure/{id}/{isDepot}")
    public Response exclureOrInclureById(@PathParam("id") String id, @PathParam("isDepot") boolean isDepot) {
        carnetAsDepotService.update(id, isDepot);
        return Response.ok().build();
    }

    @PUT
    @Path("to-be-exclude/{id}/{isExlude}")
    public Response toBeExclude(@PathParam("id") String id, @PathParam("isExlude") boolean isExlude) {
        carnetAsDepotService.setToExcludeOrNot(id, isExlude);
        return Response.ok().build();
    }

    @GET
    @Path("list-exclus")
    public Response fetchExclud(@QueryParam(value = "query") String query, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) {
        JSONObject json = carnetAsDepotService.all(start, limit, query, true);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("ventes")
    public Response fetchVenteByTiersPayant(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        JSONObject json = carnetAsDepotService.fetchVenteByTiersPayant(tiersPayantId, dtStart, dtEnd, start, limit);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("reglements")
    public Response reglementsCarnet(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "typeReglementCarnet") TypeReglementCarnet typeReglementCarnet) {
        JSONObject json = carnetAsDepotService.reglementsCarnet(tiersPayantId, typeReglementCarnet, dtStart, dtEnd,
                start, limit);
        return Response.ok().entity(json.toString()).build();

    }

    @PUT
    @Path("regler/{tiersPayantId}")
    public Response regler(@PathParam("tiersPayantId") String id, ReglementCarnetDTO o) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        JSONObject json = reglementService.faireReglementCarnetDepot(
                o.setTiersPayantId(id).typeReglementCarnet(TypeReglementCarnet.REGLEMENT), tu);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("produits")
    public Response produits(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "dtStart") String dtStart) {
        JSONObject json = carnetAsDepotService.listArticleByTiersPayant(query, tiersPayantId, dtStart, dtEnd);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("produits-one/{produitId}/{tiersPayantId}")
    public Response produitsById(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "produitId") String produitId, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "dtStart") String dtStart) {
        JSONObject json = carnetAsDepotService.articleByTiersPayantByProduitId(produitId, tiersPayantId, dtStart,
                dtEnd);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("produits-carnet-as-depot")
    public Response produitVenduParDepot(@QueryParam(value = "tiersPayantId") String tiersPayantId,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        JSONObject json = carnetAsDepotService.produitVenduParDepot(tiersPayantId, LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd), null, start, limit);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("update-old")
    public Response updateOldData() {
        carnetAsDepotService.updateOldData();

        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();

    }

    @PUT
    @Path("regler/depense/{tiersPayantId}")
    public Response reglerDepense(@PathParam("tiersPayantId") String id, ReglementCarnetDTO o) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        JSONObject json = reglementService
                .faireReglementCarnetDepot(o.setTiersPayantId(id).typeReglementCarnet(TypeReglementCarnet.DEPENSE), tu);
        return Response.ok().entity(json.toString()).build();
    }
}
