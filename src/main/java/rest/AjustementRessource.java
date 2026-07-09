/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
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
import rest.service.AjustementAnalyseService;
import rest.service.MvtProduitService;
import toolkits.parameters.commonparameter;
import util.DateConverter;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v1/ajustement")
@Produces("application/json")
@Consumes("application/json")
public class AjustementRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    MvtProduitService mvtProduitService;
    @EJB
    private AjustementAnalyseService ajustementAnalyseService;

    private TUser getUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
    }

    @POST
    @Path("creeation")
    public Response createAjustement(Params params) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setOperateur(tu);
        JSONObject json = mvtProduitService.creerAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("{id}")
    public Response cloreAjustement(@PathParam("id") String id, Params params) throws JSONException {
        params.setRefParent(id);
        JSONObject json = mvtProduitService.cloreAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("add/item")
    public Response ajusterProduitAjustement(Params params) throws JSONException {
        JSONObject json = mvtProduitService.ajusterProduitAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("item/{id}")
    public Response modifierProduitAjustement(@PathParam("id") String id, Params params) throws JSONException {
        params.setRef(id);
        JSONObject json = mvtProduitService.modifierProduitAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @DELETE
    @Path("item/{id}")
    public Response modifierProduitAjustement(@PathParam("id") String id) throws JSONException {
        JSONObject json = mvtProduitService.removeAjustementDetail(id);
        return Response.ok().entity(json.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response annulerAjustement(@PathParam("id") String id) throws JSONException {
        JSONObject json = mvtProduitService.annulerAjustement(id);
        return Response.ok().entity(json.toString()).build();
    }
    //

    @GET
    @Path("items")
    public Response ajsutementsDetails(@QueryParam(value = "query") String query,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "ajustementId") String ajustementId) throws JSONException {

        SalesStatsParams body = new SalesStatsParams();
        body.setAll(false);
        body.setQuery(query);
        body.setLimit(limit);
        body.setStart(start);
        JSONObject jsono = mvtProduitService.ajsutementsDetails(body, ajustementId);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    public Response allAjustement(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeFiltre") String typeFiltre)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<TPrivilege> attribute = (List<TPrivilege>) hs.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
        boolean canCancel = DateConverter.hasAuthorityByName(attribute, DateConverter.ACTIONDELETEAJUSTEMENT);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setCanCancel(canCancel);
        body.setShowAll(true);
        body.setAll(false);
        body.setUserId(tu);
        body.setTypeFiltre(typeFiltre);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }

        JSONObject jsono = mvtProduitService.ajsutements(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = ajustementAnalyseService.fetchAnalyse(tu, dtStart, dtEnd, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("analyse/csv")
    @Produces("text/csv")
    public Response analyseCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = ajustementAnalyseService.exportCsv(tu, dtStart, dtEnd);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"analyse_ajustements.csv\"")
                .build();
    }

    @GET
    @Path("analyse/excel")
    @Produces("application/vnd.ms-excel")
    public Response analyseExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = ajustementAnalyseService.exportExcel(tu, dtStart, dtEnd);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"analyse_ajustements.xls\"")
                .build();
    }

    @GET
    @Path("analyse/suggestion")
    public Response analyseSuggestion(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = ajustementAnalyseService.createSuggestion(tu, dtStart, dtEnd);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("analyse/inventaire")
    public Response analyseInventaire(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = ajustementAnalyseService.createInventaire(tu, dtStart, dtEnd);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("analyse/pdf")
    public Response analysePdf(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String file = ajustementAnalyseService.printPdf(tu, dtStart, dtEnd);
        // redirection vers le PDF genere (meme principe que BalancePdfServlet)
        return Response.status(Response.Status.FOUND)
                .location(java.net.URI.create(servletRequest.getContextPath() + file)).build();
    }
}
