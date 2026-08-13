package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SmsFournisseurService;
import util.Constant;

/**
 * Endpoints de l'écran "Fournisseurs SMS" : liste (filtrable actifs/désactivés), création/modification,
 * activation/désactivation et choix du fournisseur en vigueur, test d'authentification (solde). Pas de suppression : un
 * fournisseur se désactive et reste consultable/réactivable depuis l'onglet des désactivés.
 *
 * Protégé par l'AuthenticationFilter global (session requise).
 *
 * @author koben
 */
@Path("v1/sms-fournisseurs")
@Produces("application/json")
@Consumes("application/json")
public class SmsFournisseurResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SmsFournisseurService smsFournisseurService;

    private boolean isConnected() {
        HttpSession hs = servletRequest.getSession();
        return hs.getAttribute(Constant.AIRTIME_USER) instanceof TUser;
    }

    private Response deconnected() {
        return Response.ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    /**
     * Liste des fournisseurs. {@code actif=true} pour l'onglet des fournisseurs actifs, {@code actif=false} pour
     * l'onglet des désactivés, absent = tous.
     */
    @GET
    public Response findAll(@QueryParam("actif") String actif) {
        if (!isConnected()) {
            return deconnected();
        }
        Boolean filtre = null;
        if ("true".equalsIgnoreCase(actif)) {
            filtre = Boolean.TRUE;
        } else if ("false".equalsIgnoreCase(actif)) {
            filtre = Boolean.FALSE;
        }
        return Response.ok(smsFournisseurService.findAll(filtre).toString()).build();
    }

    @POST
    public Response save(String body) {
        if (!isConnected()) {
            return deconnected();
        }
        JSONObject payload;
        try {
            payload = new JSONObject(body);
        } catch (JSONException e) {
            return Response.ok(new JSONObject().put("success", false).put("msg", "Requête invalide.").toString())
                    .build();
        }
        return Response.ok(smsFournisseurService.save(payload).toString()).build();
    }

    @POST
    @Path("{id}/toggle")
    public Response toggle(@PathParam("id") String id) {
        if (!isConnected()) {
            return deconnected();
        }
        return Response.ok(smsFournisseurService.toggle(id).toString()).build();
    }

    @POST
    @Path("{id}/en-vigueur")
    public Response definirEnVigueur(@PathParam("id") String id) {
        if (!isConnected()) {
            return deconnected();
        }
        return Response.ok(smsFournisseurService.definirEnVigueur(id).toString()).build();
    }

    @POST
    @Path("{id}/tester")
    public Response tester(@PathParam("id") String id) {
        if (!isConnected()) {
            return deconnected();
        }
        return Response.ok(smsFournisseurService.tester(id).toString()).build();
    }

}
