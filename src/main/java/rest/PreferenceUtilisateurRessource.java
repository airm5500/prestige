package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import org.json.JSONTokener;
import rest.service.PreferenceUtilisateurService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Preferences de l'utilisateur connecte : GET / PUT / DELETE v1/preferences/{cle}. Chacun ne lit et n'ecrit que les
 * siennes (utilisateur pris dans la session, jamais dans la requete).
 */
@Path("v1/preferences")
@Produces(MediaType.APPLICATION_JSON)
public class PreferenceUtilisateurRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private PreferenceUtilisateurService service;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static Response echec(String message) {
        return Response.ok(new JSONObject().put("success", false).put("message", message).toString()).build();
    }

    @GET
    @Path("{cle}")
    public Response lire(@PathParam("cle") String cle) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!PreferenceUtilisateurService.cleValide(cle)) {
            return echec("Clé invalide");
        }
        String v = service.lire(u.getLgUSERID(), cle);
        JSONObject r = new JSONObject().put("success", true).put("cle", cle);
        if (v == null) {
            r.put("valeur", JSONObject.NULL);
            return Response.ok(r.toString()).build();
        }
        /* La valeur est inseree telle qu'enregistree (deja validee comme JSON a l'ecriture). */
        String s = r.toString();
        return Response.ok(s.substring(0, s.length() - 1) + ",\"valeur\":" + v + "}").build();
    }

    @PUT
    @Path("{cle}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response ecrire(@PathParam("cle") String cle, String corps) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!PreferenceUtilisateurService.cleValide(cle)) {
            return echec("Clé invalide");
        }
        if (corps == null || corps.length() > PreferenceUtilisateurService.TAILLE_MAX) {
            return echec("Valeur absente ou trop grande");
        }
        /* Validee comme JSON, puis conservee telle quelle (l'ordre des cles est garde). */
        try {
            JSONTokener t = new JSONTokener(corps);
            t.nextValue();
            if (t.nextClean() != 0) {
                return echec("Valeur JSON invalide");
            }
        } catch (Exception e) {
            return echec("Valeur JSON invalide");
        }
        service.ecrire(u.getLgUSERID(), cle, corps.trim());
        return Response.ok(new JSONObject().put("success", true).toString()).build();
    }

    @DELETE
    @Path("{cle}")
    public Response supprimer(@PathParam("cle") String cle) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!PreferenceUtilisateurService.cleValide(cle)) {
            return echec("Clé invalide");
        }
        service.supprimer(u.getLgUSERID(), cle);
        return Response.ok(new JSONObject().put("success", true).toString()).build();
    }
}
