package rest;

import dal.TUser;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.DiscussionWhatsAppService;
import rest.service.WhatsAppService;
import util.Constant;
import util.whatsapp.PieceJointe;

/**
 * Menu « Discussions WhatsApp » (CAMPAGNES SMS / WHATSAPP, demande du 25/10) : les reponses des clients par numero, et
 * la reponse de l'officine. Droit du menu verifie par le serveur pour chaque route.
 */
@Path("v1/whatsapp-discussions")
@Produces(MediaType.APPLICATION_JSON)
public class DiscussionWhatsAppRessource {

    @EJB
    private DiscussionWhatsAppService service;
    @EJB
    private WhatsAppService whatsApp;
    @Context
    private HttpServletRequest servletRequest;

    private Response refus() {
        return Droits.refus(servletRequest, Constant.LIBELLE_WHATSAPP_DISCUSSIONS, Constant.P_SM_WHATSAPP_DISCUSSIONS);
    }

    @GET
    public Response discussions(@QueryParam("q") String filtre, @QueryParam("nonLues") boolean nonLues) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.discussions(filtre, nonLues));
        m.put("nonLus", service.nonLus());
        return Response.ok(m).build();
    }

    @GET
    @Path("non-lus")
    public Response nonLus() {
        Response r = refus();
        if (r != null) {
            return r;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("nonLus", service.nonLus());
        return Response.ok(m).build();
    }

    @GET
    @Path("{numero}")
    public Response fil(@PathParam("numero") String numero) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.fil(numero));
        return Response.ok(m).build();
    }

    /** Corps : {texte, pieceJointe: {base64, nomFichier}} (piece facultative). */
    @POST
    @Path("{numero}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response repondre(@PathParam("numero") String numero, String corps) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        JSONObject o;
        try {
            o = new JSONObject(corps == null ? "{}" : corps);
        } catch (RuntimeException e) {
            return Response.ok(new JSONObject().put("success", false).put("message", "Demande illisible.").toString())
                    .build();
        }
        PieceJointe.Lecture p = PieceJointe.lire(o.optJSONObject("pieceJointe"));
        if (p.refus != null) {
            return Response.ok(new JSONObject().put("success", false).put("message", p.refus).toString()).build();
        }
        TUser u = Droits.utilisateur(servletRequest);
        return Response
                .ok(whatsApp.repondreDiscussion(numero, o.optString("texte", ""), p.piece, u.getLgUSERID()).toString())
                .build();
    }
}
