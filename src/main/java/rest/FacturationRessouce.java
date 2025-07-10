/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.CodeFactureDTO;
import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.Mode;
import commonTasks.dto.ModelFactureDTO;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.qualifier.Facturation;
import rest.service.FacturationService;
import rest.service.GenerateTicketService;
import rest.service.GenererFactureService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author kkoffi
 */
@Path("v1/facturation")
@Produces("application/json")
@Consumes("application/json")
public class FacturationRessouce {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private FacturationService facturationService;
    @Inject
    @Facturation
    private GenererFactureService genererFactureService;
    @EJB
    private GenerateTicketService generateTicketService;

    @PUT
    @Path("modelfacture/{id}")
    public Response updateModelFacture(@PathParam("id") String id, ModelFactureDTO o) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = facturationService.update(id, o);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("modelfacture")
    public Response modelfacture() throws JSONException {
        JSONObject jsono = new JSONObject();
        List<ModelFactureDTO> data = facturationService.getAll();
        jsono.put("total", data.size()).put("data", new JSONArray(data));
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("groupetierspayant")
    public Response groupetierspayant(@QueryParam("query") String query) throws JSONException {
        JSONObject jsono = facturationService.groupetierspayant(query);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("provisoires")
    public Response provisoires(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "tpid") String tpid,
            @QueryParam(value = "codegroup") String codegroup, @QueryParam(value = "typetp") String typetp,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "groupTp") String groupTp, @QueryParam(value = "mode") Mode mode) throws JSONException {
        JSONObject jsono = facturationService.provisoires(mode, groupTp, typetp, tpid, codegroup, dtStart, dtEnd, query,
                start, limit);

        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("summary/provisoires")
    public Response provisoires10(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "tpid") String tpid, @QueryParam(value = "codegroup") String codegroup,
            @QueryParam(value = "typetp") String typetp, @QueryParam(value = "groupTp") String groupTp)
            throws JSONException {
        JSONObject jsono = facturationService.provisoires10(groupTp, typetp, tpid, codegroup, true, start, limit);

        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("summary/generer")
    public Response genererFactureTemporaire(GenererFactureDTO datas) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        List<CodeFactureDTO> os = genererFactureService.genererFactureTemporaire(datas);
        hs.setAttribute("codefacturedto", os);
        JSONObject jsono = new JSONObject();
        jsono.put("success", true);
        return Response.ok().entity(jsono.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        facturationService.removeFacture(id);
        return Response.ok().build();
    }

    @GET
    @Path("invoices")
    public Response invoices(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "tpid") String tpid,
            @QueryParam(value = "codegroup") String codegroup, @QueryParam(value = "typetp") String typetp,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "groupTp") String groupTp, @QueryParam(value = "mode") Mode mode) throws JSONException {
        return provisoires(start, limit, query, tpid, codegroup, typetp, dtEnd, dtStart, groupTp, mode);
    }

    @GET
    @Path("ticket-facture/{dossier-facture-id}")
    public Response printTicketReglementFacture(@PathParam("dossier-facture-id") String lgDossierReglementId) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok(generateTicketService.printReglementFacture(lgDossierReglementId, tu).toString()).build();
    }
}
