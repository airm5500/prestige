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
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FamilleArticleService;
import rest.service.SuggestionService;
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
            @QueryParam(value = "qtyOrCa") boolean qtyOrCa, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = familleArticleService.geVingtQuatreVingt(dtStart, dtEnd, tu, codeFamillle, codeRayon,
                codeGrossiste, 0, 0, qtyOrCa);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("suggestionvingtQuatreVingt")
    public Response suggestionvingtQuatreVingt(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamillle") String codeFamillle,
            @QueryParam(value = "qtyOrCa") boolean qtyOrCa, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<VenteDetailsDTO> datas = familleArticleService.geVingtQuatreVingt(dtStart, dtEnd, tu, codeFamillle,
                codeRayon, codeGrossiste, 0, 0, true, qtyOrCa);
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

}
