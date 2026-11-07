package rest;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.extranet.ExtranetService;
import rest.service.extranet.commun.SourceExtranet;
import util.Constant;

/**
 * EXTRANETS GROSSISTES (plan du 07/11), lecture seule. Menu « Extranets grossistes » (GESTION DES COMMANDES), droit
 * P_SM_EXTRANETS_GROSSISTES. Renseigner ou effacer la session d'un extranet est reserve a l'administrateur ; la valeur
 * de la session n'est jamais renvoyee.
 */
@Path("v1/extranet")
@Produces(MediaType.APPLICATION_JSON)
public class ExtranetRessource {

    static final String DROIT = "P_SM_EXTRANETS_GROSSISTES";
    static final String LIBELLE = "Extranets grossistes";

    @Inject
    private HttpServletRequest requete;

    @EJB
    private ExtranetService service;

    private Response refus() {
        return Droits.refus(requete, LIBELLE, DROIT);
    }

    private boolean administrateur() {
        Object role = requete.getSession(false) == null ? null
                : requete.getSession(false).getAttribute(Constant.USER_ROLE_ID);
        return role != null && service.administrateur(role.toString());
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response sourceInconnue() {
        return Response.status(Response.Status.BAD_REQUEST).type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", "Extranet inconnu").toString()).build();
    }

    @GET
    @Path("sessions")
    public Response sessions() {
        Response r = refus();
        return r != null ? r : ok(service.sessions().put("administrateur", administrateur()));
    }

    /** Corps : {"cookies": "SESSIONID=..."} ; administrateur seulement. */
    @PUT
    @Path("sessions/{source}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response definirSession(@PathParam("source") String source, String corps) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Renseigner la session d'un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        if (s == null) {
            return sourceInconnue();
        }
        String cookies;
        try {
            cookies = new JSONObject(corps == null ? "{}" : corps).optString("cookies", null);
        } catch (Exception e) {
            cookies = null;
        }
        return ok(service.definirSession(s, cookies, Droits.utilisateur(requete).getStrLOGIN()));
    }

    @DELETE
    @Path("sessions/{source}")
    public Response effacerSession(@PathParam("source") String source) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Effacer la session d'un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        return s == null ? sourceInconnue() : ok(service.effacerSession(s));
    }

    @GET
    @Path("{source}/collectes")
    public Response collectes(@PathParam("source") String source, @QueryParam("module") String module,
            @DefaultValue("20") @QueryParam("nombre") int nombre) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        SourceExtranet s = SourceExtranet.lire(source);
        return s == null ? sourceInconnue() : ok(service.collectes(s, module, nombre));
    }

    @GET
    @Path("collectes/{id}")
    public Response collecte(@PathParam("id") long id) {
        Response r = refus();
        return r != null ? r : ok(service.collecte(id));
    }
}
