/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import dal.TUser;
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
import rest.service.GenerateTicketService;
import rest.service.ReglementService;
import util.Constant;
import toolkits.parameters.commonparameter;

/**
 *
 * @author DICI
 */
@Path("v1/reglement")
@Produces("application/json")
@Consumes("application/json")
public class ReglementRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    ReglementService reglementService;
    @EJB
    GenerateTicketService generateTicketService;

    @GET
    @Path("liste")
    public Response searchProduct(@QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "userId") String userId, @QueryParam(value = "pairclient") boolean pairclient)
            throws JSONException {

        Params body = new Params();
        if (!"".equals(query)) {
            body.setDescription(query);
        }
        if (!"".equals(userId)) {
            body.setRef(userId);
        }
        body.setDtEnd(dtEnd);
        body.setDtStart(dtStart);
        JSONObject jsono = reglementService.listeDifferesData(body, pairclient);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("reglementdiffere")
    public Response faireReglementDiffere(ClotureVenteParams clotureVenteParams) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        clotureVenteParams.setUserId(tu);
        JSONObject json = reglementService.reglerDiffere(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("reglementdiffere-all")
    public Response faireReglementDiffereAll(ClotureVenteParams clotureVenteParams) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        clotureVenteParams.setUserId(tu);
        JSONObject json = reglementService.reglerDiffereAll(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("delayed")
    public Response listeReglementDifferes(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "clientId") String clientId)
            throws JSONException {

        JSONObject jsono = reglementService.reglementsDifferes(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), true,
                clientId);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("details")
    public Response detailsDifferes(@QueryParam(value = "ref") String ref) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = reglementService.detailsReglmentDiffere(ref);
        return Response.ok().entity(jsono.toString()).build();
    }

    @PUT
    @Path("ticket/{id}")
    public Response getTicket(@PathParam("id") String ref) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = generateTicketService.ticketReglementDiffere(ref);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("ticket-carnet/{id}")
    public Response print(@PathParam("id") String ref) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = generateTicketService.ticketReglementCarnet(ref);
        return Response.ok().entity(json.toString()).build();
    }
}
