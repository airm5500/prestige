/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.TUser;
import toolkits.parameters.commonparameter;
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

    @EJB
    PharmaMlService pharmaMlService;
    @javax.ws.rs.core.Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    /** Point 5 du 08/10 : equivalents proposes (EP) par les grossistes, en attente de decision. */
    @GET
    @Path("remplacements")
    public Response remplacements() {
        if (utilisateur() == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        return Response.ok(pharmaMlService.remplacementsProposes().toString()).build();
    }

    /** decision = ACCEPTER | REFUSER ; memoriser = meme choix automatique pour ce couple de produits. */
    @POST
    @Path("remplacements/{id}")
    public Response deciderRemplacement(@PathParam("id") String id, @QueryParam("decision") String decision,
            @QueryParam("memoriser") boolean memoriser) {
        TUser u = utilisateur();
        if (u == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        if (!"ACCEPTER".equals(decision) && !"REFUSER".equals(decision)) {
            return Response.ok(new JSONObject().put("success", false).put("msg", "Décision inconnue").toString())
                    .build();
        }
        return Response
                .ok(pharmaMlService.deciderRemplacement(id, "ACCEPTER".equals(decision), memoriser, u).toString())
                .build();
    }

    @PUT
    @Path("{id}")
    public Response envoiPharmaCommande(@PathParam("id") String commandeId) throws JSONException {

        JSONObject json = pharmaMlService.envoiCommande(commandeId, LocalDate.now().plusDays(1), 0, null, null);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Reponses differees (FIN_SERVICE puis VIDAGE, specification v4.8 § 4.1.3) : interroge le grossiste donne, ou tous
     * les grossistes actifs a lien PharmaML.
     */
    @POST
    @Path("reponses")
    public Response recupererReponses(@QueryParam("grossiste") String grossisteId) {
        return Response.ok(pharmaMlService.recupererReponses(grossisteId, false).toString()).build();
    }

    /** Envois recus par le grossiste et sans reponse (ou reponses non rattachees). */
    @GET
    @Path("attentes")
    public Response attentes() {
        return Response.ok(pharmaMlService.attentes().toString()).build();
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
        return Response
                .ok(pharmaMlService.renvoiPharmaCommande(ruptureId, grossiste, LocalDate.now().plusDays(1)).toString())
                .build();
    }

    @GET
    @Path("rupture/responseorder")
    public Response reponseRupture(@QueryParam("ruptureId") String orderId) throws JSONException {

        /* JSONObject json = pharmaMlService.reponseRupture(orderId, tu); */
        return Response.ok().build();
    }

}
