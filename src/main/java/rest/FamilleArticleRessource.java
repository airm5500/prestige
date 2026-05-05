/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.VenteDetailsDTO;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FamilleArticleService;
import rest.service.SuggestionService;
import rest.service.dto.VingtQuatreVingtType;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v1/statfamillearticle")
@Produces("application/json")
@Consumes("application/json")
public class FamilleArticleRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    FamilleArticleService familleArticleService;
    @EJB
    SuggestionService suggestionService;

    @GET
    public Response statistiqueFamilleArticles(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = familleArticleService.statistiqueParFamilleArticleView(dtStart, dtEnd, codeFamillle, query,
                tu, codeRayon, codeGrossiste);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("vingtQuatreVingt")
    public Response vingtQuatreVingt(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @DefaultValue("CA") @QueryParam(value = "vingtType") VingtQuatreVingtType vingtQuatreVingtType,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {

        JSONObject jsono = familleArticleService.geVingtQuatreVingt(dtStart, dtEnd, codeFamillle, codeRayon,
                codeGrossiste, 0, 0, vingtQuatreVingtType);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("suggestionvingtQuatreVingt")
    public Response suggestionvingtQuatreVingt(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @DefaultValue("CA") @QueryParam(value = "vingtType") VingtQuatreVingtType vingtQuatreVingtType,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {

        List<VenteDetailsDTO> datas = familleArticleService.geVingtQuatreVingt(dtStart, dtEnd, codeFamillle, codeRayon,
                codeGrossiste, 0, 0, true, vingtQuatreVingtType);
        JSONObject jsono = suggestionService.makeSuggestion(datas);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("statisticprovider")
    public Response statistiqueParGrossistes(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = familleArticleService.statistiqueParGrossistesView(dtStart, dtEnd, codeFamillle, query, tu,
                codeRayon, codeGrossiste);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("statisticrayons")
    public Response statistiqueParRayons(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = familleArticleService.statistiqueParRayonsView(dtStart, dtEnd, codeFamillle, query, tu,
                codeRayon, codeGrossiste);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("veto")
    public Response statistiqueFamilleArticlesVeto(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = familleArticleService.statistiqueParFamilleArticleViewVeto(dtStart, dtEnd, codeFamillle,
                query, tu, codeRayon, codeGrossiste);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("vingtQuatreVingt/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportVingtQuatreVingtExcel(@QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("codeFamillle") String codeFamillle,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @DefaultValue("CA") @QueryParam(value = "vingtType") VingtQuatreVingtType vingtQuatreVingtType)
            throws JSONException {

        byte[] data = familleArticleService.buildVingtQuatreVingtExcel(dtStart, dtEnd, codeFamillle, codeRayon,
                codeGrossiste, vingtQuatreVingtType);

        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"vingtQuatreVingt.xls\"").build();
    }

    @GET
    @Path("vingtQuatreVingt/csv")
    @Produces("text/csv")
    public Response exportVingtQuatreVingtCsv(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("codeFamillle") String codeFamillle, @QueryParam("codeRayon") String codeRayon,
            @QueryParam("codeGrossiste") String codeGrossiste,
            @DefaultValue("CA") @QueryParam(value = "vingtType") VingtQuatreVingtType vingtQuatreVingtType)
            throws JSONException {

        byte[] data = familleArticleService.buildVingtQuatreVingtCsv(dtStart, dtEnd, codeFamillle, codeRayon,
                codeGrossiste, vingtQuatreVingtType);

        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"vingtQuatreVingt.csv\"").build();
    }

    @GET
    @Path("vingtQuatreVingt/inventaire")
    public Response createInventaireVingtQuatreVingt(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @DefaultValue("CA") @QueryParam(value = "vingtType") VingtQuatreVingtType vingtQuatreVingtType,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {

        JSONObject jsono = familleArticleService.createInventaireVingtQuatreVingt(dtStart, dtEnd, codeFamillle,
                codeRayon, codeGrossiste, vingtQuatreVingtType);

        return Response.ok().entity(jsono.toString()).build();
    }

}
