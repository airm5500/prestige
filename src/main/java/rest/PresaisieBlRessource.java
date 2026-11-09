package rest;

import dal.TUser;
import java.time.LocalDate;
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
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.presaisie.PresaisieBlRegles;
import rest.service.presaisie.PresaisieBlService;

/**
 * Menu « Pre-saisie des BL » (plan avoir du 08/11, point 6, phase 1) : creer, modifier (tant que « A saisir »),
 * supprimer avec un motif, lister avec des filtres. Toutes les routes exigent le privilege P_SM_PRESAISIE_BL (session
 * absente : 401 ; droit manquant : 403).
 */
@Path("v1/presaisie-bl")
@Produces("application/json")
@Consumes("application/json")
public class PresaisieBlRessource {

    static final String DROIT = "P_SM_PRESAISIE_BL";
    static final String LIBELLE = "Pré-saisie des BL";

    @EJB
    private PresaisieBlService service;

    @Context
    private HttpServletRequest servletRequest;

    private Response refus() {
        return Droits.refus(servletRequest, LIBELLE, DROIT);
    }

    private static Response json(Object o) {
        return Response.ok().entity(o.toString()).build();
    }

    private static JSONObject corps(String texte) {
        try {
            return new JSONObject(texte == null || texte.trim().isEmpty() ? "{}" : texte);
        } catch (JSONException e) {
            return null;
        }
    }

    private static PresaisieBlRegles.Saisie saisie(JSONObject c) {
        return PresaisieBlRegles.controler(c.optString("grossisteId", null), c.optString("numero", null),
                c.optString("date", null), c.opt("montantHt"), c.opt("montantTva"), c.optString("sequence", null),
                c.optString("commandeId", null), LocalDate.now());
    }

    @GET
    public Response lister(@QueryParam("grossiste") String grossiste, @QueryParam("etat") String etat,
            @QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("numero") String numero,
            @QueryParam("start") int start, @QueryParam("limit") int limit) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        PresaisieBlService.Filtres f = new PresaisieBlService.Filtres();
        f.grossisteId = grossiste;
        f.etat = etat;
        f.du = du;
        f.au = au;
        f.numero = numero;
        f.start = start;
        f.limit = limit;
        return json(service.lister(f));
    }

    @GET
    @Path("grossistes")
    public Response grossistes() {
        Response r = refus();
        return r != null ? r : json(new JSONObject().put("success", true).put("data", service.grossistes()));
    }

    @GET
    @Path("commandes")
    public Response commandes(@QueryParam("grossiste") String grossiste) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (grossiste == null || grossiste.trim().isEmpty()) {
            return json(new JSONObject().put("success", true).put("data", new org.json.JSONArray()));
        }
        return json(new JSONObject().put("success", true).put("data", service.commandes(grossiste.trim())));
    }

    @GET
    @Path("{id}")
    public Response lire(@PathParam("id") String id) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        JSONObject l = service.lire(id);
        return json(l == null ? new JSONObject().put("success", false).put("msg", "Pré-saisie introuvable.")
                : new JSONObject().put("success", true).put("data", l));
    }

    @POST
    public Response creer(String texte) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        JSONObject c = corps(texte);
        if (c == null) {
            return json(new JSONObject().put("success", false).put("msg", "Requête illisible."));
        }
        TUser u = Droits.utilisateur(servletRequest);
        return json(service.creer(saisie(c), u.getLgUSERID()));
    }

    @PUT
    @Path("{id}")
    public Response modifier(@PathParam("id") String id, String texte) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        JSONObject c = corps(texte);
        if (c == null) {
            return json(new JSONObject().put("success", false).put("msg", "Requête illisible."));
        }
        TUser u = Droits.utilisateur(servletRequest);
        return json(service.modifier(id, saisie(c), u.getLgUSERID()));
    }

    /** Suppression avec un motif : la ligne reste (etat « Supprime »), pour la trace. */
    @POST
    @Path("{id}/suppression")
    public Response supprimer(@PathParam("id") String id, String texte) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        JSONObject c = corps(texte);
        if (c == null) {
            return json(new JSONObject().put("success", false).put("msg", "Requête illisible."));
        }
        TUser u = Droits.utilisateur(servletRequest);
        return json(service.supprimer(id, c.optString("motif", ""), u.getLgUSERID()));
    }
}
