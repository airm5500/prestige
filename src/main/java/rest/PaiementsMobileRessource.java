package rest;

import dal.TUser;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.paiements.PaiementsMobileService;
import util.Constant;

/**
 * B3 (Prestige Mobile) : paiements mobile money par agrégateur. Session cookie habituelle (comme les ventes), SAUF le
 * webhook {@code notification/{fournisseur}} : public (exempté dans AuthenticationFilter), protégé par la signature du
 * fournisseur ET la revérification du statut auprès de son API.
 * <ul>
 * <li>GET capacites → {paiementsMobile: [opérateurs], fournisseur, expirationMin} (liste vide = désactivé)</li>
 * <li>POST / {venteId, operateur, part?, cloturer} (en-tête X-Client-Ref facultatif) → paiement créé (montant du
 * serveur), lien / QR</li>
 * <li>GET {id} → statut (revérifié chez le fournisseur) ; POST {id}/annuler</li>
 * <li>GET ?date=AAAA-MM-JJ → historique du jour</li>
 * <li>POST notification/{fournisseur} → webhook</li>
 * <li>POST {id}/simuler?payer=true|false → simulateur seulement</li>
 * </ul>
 */
@Path("v1/paiements-mobile")
@Produces(MediaType.APPLICATION_JSON)
public class PaiementsMobileRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private PaiementsMobileService service;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }

    private static Response deconnecte() {
        return ok(new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE));
    }

    @GET
    @Path("capacites")
    public Response capacites() {
        return ok(service.capacites());
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response creer(String corps, @Context HttpHeaders h) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        JSONObject b;
        try {
            b = new JSONObject(corps == null || corps.isBlank() ? "{}" : corps);
        } catch (RuntimeException e) {
            return ok(new JSONObject().put("success", false).put("message", "Demande illisible."));
        }
        // Le montant éventuellement envoyé est IGNORÉ : seul « part » (paiement en deux modes) est accepté, contrôlé
        // par le serveur (inférieur ou égal au net de la vente).
        Integer part = b.has("part") && !b.isNull("part") ? b.optInt("part") : null;
        return ok(service.creer(u, b.optString("venteId", null), b.optString("operateur", null), part,
                b.optBoolean("cloturer", false), h.getHeaderString("X-Client-Ref")));
    }

    @GET
    @Path("{id}")
    public Response statut(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return ok(service.statut(id));
    }

    @POST
    @Path("{id}/annuler")
    public Response annuler(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return ok(service.annuler(id));
    }

    @GET
    public Response historique(@QueryParam("date") String date) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j;
        try {
            j = date == null || date.isBlank() ? LocalDate.now() : LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            return ok(new JSONObject().put("success", false).put("message", "Date invalide (AAAA-MM-JJ)."));
        }
        return ok(service.historique(j));
    }

    @POST
    @Path("{id}/simuler")
    public Response simuler(@PathParam("id") String id, @QueryParam("payer") boolean payer,
            @QueryParam("montant") Integer montant) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return ok(service.simuler(id, payer, montant));
    }

    /** Webhook PUBLIC du fournisseur : corps brut (la signature porte sur les octets reçus). */
    @POST
    @Path("notification/{fournisseur}")
    @Consumes(MediaType.WILDCARD)
    public Response notification(@PathParam("fournisseur") String fournisseur, String corps, @Context HttpHeaders h) {
        int code = service.notification(fournisseur, corps, h::getHeaderString);
        return Response.status(code).entity(new JSONObject().put("success", code == 200).toString())
                .type(MediaType.APPLICATION_JSON).build();
    }

    /** Page de retour du navigateur du client après paiement (publique, aucune donnée). */
    @GET
    @Path("retour")
    @Produces(MediaType.TEXT_HTML)
    public Response retour() {
        return Response
                .ok("<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">"
                        + "<p style=\"font-family:sans-serif;font-size:20px;text-align:center;margin-top:40px\">Merci. "
                        + "Retournez à la borne ou au comptoir de la pharmacie.</p>", MediaType.TEXT_HTML)
                .build();
    }

    /** Certains fournisseurs testent l'adresse par un GET : simple accusé de réception. */
    @GET
    @Path("notification/{fournisseur}")
    public Response notificationPing(@PathParam("fournisseur") String fournisseur) {
        return ok(new JSONObject().put("success", true));
    }
}
