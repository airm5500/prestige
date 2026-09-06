package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.ModeleMessageService;
import util.Constant;

/** Modeles de messages SMS / WhatsApp */
@Path("v1/modeles-messages")
@Produces("application/json")
@Consumes("application/json")
public class ModeleMessageRessource {

    @EJB
    private ModeleMessageService modeleMessageService;
    @Context
    private HttpServletRequest servletRequest;

    /** Modeles actifs du canal (SMS, WHATSAPP) ; tous=true pour l'ecran d'administration. */
    @GET
    public Response lister(@QueryParam("canal") String canal, @QueryParam("tous") boolean tous) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok().entity(modeleMessageService.lister(canal, tous).toString()).build();
    }

    @POST
    public Response creer(String corps) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONObject o = new JSONObject(corps == null || corps.isBlank() ? "{}" : corps);
        JSONObject r = modeleMessageService.enregistrer(null, o.optString("libelle"), o.optString("canal"),
                o.optString("contenu"));
        return Response.status(r.optBoolean("success") ? Response.Status.CREATED : Response.Status.BAD_REQUEST)
                .entity(r.toString()).build();
    }

    @PUT
    @Path("{id}")
    public Response modifier(@PathParam("id") String id, String corps) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONObject o = new JSONObject(corps == null || corps.isBlank() ? "{}" : corps);
        JSONObject r = modeleMessageService.enregistrer(id, o.optString("libelle"), o.optString("canal"),
                o.optString("contenu"));
        return Response.status(r.optBoolean("success") ? Response.Status.OK : Response.Status.BAD_REQUEST)
                .entity(r.toString()).build();
    }

    @POST
    @Path("{id}/toggle")
    public Response basculer(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok().entity(modeleMessageService.basculer(id).toString()).build();
    }

    /** Duplique un modele. Le modele source reste inchange ; la copie est cree sous un libelle libre. */
    @POST
    @Path("{id}/dupliquer")
    public Response dupliquer(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONObject r = modeleMessageService.dupliquer(id);
        return Response.status(r.optBoolean("success") ? Response.Status.CREATED : Response.Status.BAD_REQUEST)
                .entity(r.toString()).build();
    }

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
    }
}
