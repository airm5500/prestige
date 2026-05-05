/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleDTO;
import dal.TUser;
import enumeration.MargeEnum;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
import rest.service.DataReporingService;
import rest.service.SuggestionService;
import util.Constant;
import toolkits.parameters.commonparameter;

/**
 *
 * @author DICI
 */
@Path("v1/datareporting")
@Produces("application/json")
@Consumes("application/json")
public class DataReporingRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private DataReporingService dataReporingService;
    @EJB
    private SuggestionService suggestionService;

    @GET
    @Path("margeproduitsvendus")
    public Response margeProduitsVendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "critere") Integer critere,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "filtre") MargeEnum filtre)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.margeProduitsVendus(dtStart, dtEnd, codeFamile, critere, query, tu,
                codeRayon, codeGrossiste, start, limit, filtre);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("unitesvendues")
    public Response statsUnintesVendues(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsUnintesVendues(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("unitesvendueslaboratoires")
    public Response statsUnintesVenduesparLaboratoire(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "laboratoireId") String laboratoireId, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsUnintesVenduesparLaboratoire(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, laboratoireId, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("unitesvenduesgamme")
    public Response statsUnintesVenduesparGamme(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "gammeId") String gammeId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsUnintesVenduesparGamme(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, gammeId, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("articleInvendus")
    public Response articlesInvendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum filtre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, stock, filtre, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("suggestion")
    public Response makeSuggestionFromArticleInvendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum filtre

    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<ArticleDTO> datas = dataReporingService.statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, stock, filtre, 0, 0, true);
        JSONObject jsono = suggestionService.makeSuggestionFromArticleInvendus(datas, tu);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("articleInvendus/csv")
    @Produces("text/csv")
    public Response exportArticlesInvendusCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum stockFiltre) throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = dataReporingService.exportArticlesInvendusCsv(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, stock, stockFiltre);

        String filename = "articles-invendus_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".csv";

        return Response.ok(data, "text/csv; charset=UTF-8").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("articleInvendus/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportArticlesInvendusExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum stockFiltre) throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = dataReporingService.exportArticlesInvendusExcel(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, stock, stockFiltre);

        String filename = "articles-invendus_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".xls";

        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("articleInvendus/create-inventaire")
    public Response createInventaireArticlesInvendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum stockFiltre) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = dataReporingService.createInventaireArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, stock, stockFiltre);

        return Response.ok().entity(jsono.toString()).build();
    }
}
