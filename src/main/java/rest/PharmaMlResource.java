/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.TUser;
import java.time.LocalDate;
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
import rest.service.PharmaMlService;

import util.Constant;

/**
 *
 * @author kkoffi
 */
@Path("v1/pharma")
@Produces("application/json")
@Consumes("application/json")
public class PharmaMlResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    PharmaMlService pharmaMlService;

    @PUT
    @Path("{id}")
    public Response envoiPharmaCommande(@PathParam("id") String commandeId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = pharmaMlService.envoiCommande(commandeId, LocalDate.now().plusDays(1), 0, null, null);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("infos/{id}")
    public Response envoiPharmaInfosProduit(@PathParam("id") String commandeId) throws JSONException {

        JSONObject json = pharmaMlService.envoiPharmaInfosProduit(commandeId);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("responseorder")
    public Response verificationCommandeReponse(@QueryParam("orderId") String orderId) throws JSONException {
        // JSONObject json = pharmaMlService.lignesCommandeRetour(null, orderId);
        return Response.ok().build();
    }

    @PUT
    @Path("rupture/{id}/{grossiste}")
    public Response renvoiPharmaCommande(@PathParam("id") String ruptureId, @PathParam("grossiste") String grossiste)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        /*
         * JSONObject json = pharmaMlService.renvoiPharmaCommande(ruptureId, grossiste, LocalDate.now().plusDays(1), 0,
         * null, null);
         */
        return Response.ok().build();
    }

    @GET
    @Path("rupture/responseorder")
    public Response reponseRupture(@QueryParam("ruptureId") String orderId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        /* JSONObject json = pharmaMlService.reponseRupture(orderId, tu); */
        return Response.ok().build();
    }

}
