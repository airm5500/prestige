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
import rest.service.MvtProduitService;
import toolkits.parameters.commonparameter;
import util.DateConverter;

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
    
    @POST
    @Path("creeation")
    public Response createAjustement(Params params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
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
    public Response ajsutementsDetails(
            @QueryParam(value = "query") String query,
             @QueryParam(value = "start") int start,
              @QueryParam(value = "limit") int limit,
            @QueryParam(value = "ajustementId") String ajustementId
    ) throws JSONException {
        
        SalesStatsParams body = new SalesStatsParams();
        body.setAll(false);
        body.setQuery(query);
        body.setLimit(limit);
        body.setStart(start);
        JSONObject jsono = mvtProduitService.ajsutementsDetails(body, ajustementId);
        return Response.ok().entity(jsono.toString()).build();
    }    
    
    @GET
    public Response allAjustement(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
             @QueryParam(value = "typeFiltre") String typeFiltre
    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        List<TPrivilege> attribute = (List<TPrivilege>) hs.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
        boolean canCancel = DateConverter.hasAuthorityByName(attribute, DateConverter.ACTIONDELETEAJUSTEMENT);
//             boolean asAuthority = DateConverter.hasAuthorityByName(attribute, commonparameter.str_SHOW_VENTE);
     
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
}
