/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleDTO;
import dal.TUser;
import enumeration.MargeEnum;
import enumeration.Peremption;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FicheArticleService;
import rest.service.SuggestionService;
import toolkits.parameters.commonparameter;

/**
 *
 * @author DICI
 */
@Path("v1/fichearticle")
@Produces("application/json")
@Consumes("application/json")
public class FicheArticleRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    FicheArticleService ficheArticleService;
    @EJB
    private SuggestionService suggestionService;

    @GET
    @Path("perimes")
    public Response produitPerimes(
            @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "filtre") Peremption filtre,
            @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        if (filtre == null) {
            filtre = Peremption.PERIME;
        }
        JSONObject jsono = ficheArticleService.produitPerimes(query, dtStart, filtre, tu, codeFamile, codeRayon, codeGrossiste, 0, 0);
        return Response.ok().entity(jsono.toString()).build();
    }

    @PUT
    @Path("dateperemption/{id}/{date}")
    public Response modifierDatePeremption(
            @PathParam("id") String id, @PathParam("date") String datePeremption
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        JSONObject jsono = ficheArticleService.modifierArticleDatePeremption(id, datePeremption);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("surstocks")
    public Response articleSurStock(
            @QueryParam(value = "nbreMois") int nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "nbreConsommation") int nbreConsommation
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        JSONObject jsono = ficheArticleService.articleSurStock(tu, query, codeFamile, codeRayon, codeGrossiste, nbreMois, nbreConsommation, 0, 0);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("comparaison")
    public Response comparaisonStock(
            @QueryParam(value = "seuil") int seuil,
            @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "filtreSeuil") MargeEnum filtreSeuil,
            @QueryParam(value = "filtreStock") MargeEnum filtreStock,
            @QueryParam(value = "stock") int stock,
            @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        JSONObject jsono = ficheArticleService.comparaisonStock(tu, query, filtreStock, filtreSeuil, codeFamile, codeRayon, codeGrossiste, stock, seuil, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("comparaison/details/{id}")
    public Response produitConsomamation(
            @PathParam("id") String id,
            @QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        JSONObject jsono = ficheArticleService.produitConsomamation(tu, query, dtStart, dtEnd, id, 0, 0);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("comparaison/suggestion")
    public Response suggestion(
            @QueryParam(value = "seuil") int seuil,
            @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "filtreSeuil") MargeEnum filtreSeuil,
            @QueryParam(value = "filtreStock") MargeEnum filtreStock,
            @QueryParam(value = "stock") int stock,
            @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        List<ArticleDTO> datas = ficheArticleService.comparaisonStock(tu, query, filtreStock, filtreSeuil, codeFamile, codeRayon, codeGrossiste, stock, seuil, 0, 0, true);
        JSONObject json = suggestionService.makeSuggestionFromArticleInvendus(datas, tu);
        return Response.ok().entity(json.toString()).build();
    }
}