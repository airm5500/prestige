/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
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
import rest.service.MouvementProduitService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v2/ajustement")
@Produces("application/json")
@Consumes("application/json")
public class AjustRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private MouvementProduitService mvtProduitService;

    @POST
    @Path("creeation")
    public Response createAjustement(Params params) throws JSONException {
        // meme droit que v1 (demandes des applications mobiles, 1)
        Response refus = Droits.refus(servletRequest, "Ajustement du stock", "P_SM_AJUSTEMENT");
        if (refus != null) {
            return refus;
        }
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
        // meme droit que v1 (demandes des applications mobiles, 1)
        Response refus = Droits.refus(servletRequest, "Ajustement du stock", "P_SM_AJUSTEMENT");
        if (refus != null) {
            return refus;
        }
        params.setRefParent(id);

        JSONObject json = mvtProduitService.cloreAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("add/item")
    public Response ajusterProduitAjustement(Params params) throws JSONException {
        // meme droit que v1 (demandes des applications mobiles, 1)
        Response refus = Droits.refus(servletRequest, "Ajustement du stock", "P_SM_AJUSTEMENT");
        if (refus != null) {
            return refus;
        }
        JSONObject json = mvtProduitService.ajusterProduitAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("item/{id}")
    public Response modifierProduitAjustement(@PathParam("id") String id, Params params) throws JSONException {
        // meme droit que v1 (demandes des applications mobiles, 1)
        Response refus = Droits.refus(servletRequest, "Ajustement du stock", "P_SM_AJUSTEMENT");
        if (refus != null) {
            return refus;
        }
        params.setRef(id);
        JSONObject json = mvtProduitService.modifierProduitAjustement(params);
        return Response.ok().entity(json.toString()).build();
    }

    @DELETE
    @Path("item/{id}")
    public Response modifierProduitAjustement(@PathParam("id") String id) throws JSONException {
        // meme droit que v1 (demandes des applications mobiles, 1)
        Response refus = Droits.refus(servletRequest, "Ajustement du stock", "P_SM_AJUSTEMENT");
        if (refus != null) {
            return refus;
        }
        JSONObject json = mvtProduitService.removeAjustementDetail(id);
        return Response.ok().entity(json.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response annulerAjustement(@PathParam("id") String id) throws JSONException {
        // meme droit que v1 (demandes des applications mobiles, 1)
        Response refus = Droits.refus(servletRequest, "Ajustement du stock", "P_SM_AJUSTEMENT");
        if (refus != null) {
            return refus;
        }
        JSONObject json = mvtProduitService.annulerAjustement(id);
        return Response.ok().entity(json.toString()).build();
    }
    //

    @GET
    @Path("items")
    public Response ajsutementsDetails(@QueryParam(value = "query") String query,
            @QueryParam(value = "ajustementId") String ajustementId) throws JSONException {

        SalesStatsParams body = new SalesStatsParams();

        body.setQuery(query);

        JSONObject jsono = mvtProduitService.ajsutementsDetails(body, ajustementId);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    public Response allAjustement(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        /*
         * Un ajustement cloture ne s'annule jamais (refus serveur, code ETAT) : la liste n'offre aucune annulation.
         * L'ancien calcul comparait un NOM de privilege a son identifiant ("030920172") et valait donc toujours faux ;
         * la valeur est maintenant fixee explicitement, sans changement de comportement (15/10).
         */
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setCanCancel(false);
        body.setAll(false);
        body.setUserId(tu);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }

        JSONObject jsono = mvtProduitService.ajsutements(body);
        return Response.ok().entity(jsono.toString()).build();
    }
}
