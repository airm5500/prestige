package rest;

import java.util.Optional;
import javax.ejb.EJB;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.mobile.MobileClientRefService;

/**
 * H4 (Prestige Mobile) : relecture d'une creation faite avec l'en-tete {@code X-Client-Ref}.
 * <p>
 * {@code GET v1/app-vente/client-ref/{ref}} : {@code {success, type, id, reference, statut}} ou 404 si la cle est
 * inconnue (la creation n'a jamais eu lieu : le telephone peut la renvoyer sans risque de doublon).
 * <p>
 * Authentification : session habituelle de l'application (cookie), comme les routes de vente. Le prefixe
 * {@code v1/app-vente/} est volontairement distinct de {@code v1/mobile/} (reserve a l'API a jeton Bearer) : aucune
 * exception n'est ajoutee a filter.AuthenticationFilter.
 */
@Path("v1/app-vente/client-ref")
@Produces(MediaType.APPLICATION_JSON)
public class MobileClientRefRessource {

    @EJB
    private MobileClientRefService service;

    @GET
    @Path("{ref}")
    public Response lire(@PathParam("ref") String ref) {
        Optional<MobileClientRefService.Entree> e = service.lire(ref);
        if (!e.isPresent() || e.get().entityId == null) {
            return Response.status(Response.Status.NOT_FOUND).type(MediaType.APPLICATION_JSON)
                    .entity(new JSONObject().put("success", false).put("msg", "Clé client inconnue.").toString())
                    .build();
        }
        MobileClientRefService.Entree x = e.get();
        String statut = service.statut(x);
        JSONObject o = new JSONObject().put("success", true).put("ref", x.ref).put("type", x.type).put("id", x.entityId)
                .put("reference", x.reference == null ? JSONObject.NULL : x.reference)
                .put("statut", statut == null ? JSONObject.NULL : statut).put("existe", statut != null);
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }
}
