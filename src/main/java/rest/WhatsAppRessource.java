package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.DELETE;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.WhatsAppService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * WhatsApp (plan d'octobre, section 4.2, lot L10). Comptes, essai et journal : privilege P_SM_WHATSAPP. Les deux
 * webhooks sont appeles SANS session (exemptes dans le filtre d'authentification) : Meta est authentifie par la
 * signature HMAC du corps, le service compagnon par son jeton partage. Aucun secret n'est jamais renvoye.
 */
@Path("v1/whatsapp")
@Produces(MediaType.APPLICATION_JSON)
public class WhatsAppRessource {

    static final String PRIVILEGE = "P_SM_WHATSAPP";

    @EJB
    private WhatsAppService service;
    @EJB
    private rest.service.WhatsAppWebService web;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private Response controle() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        boolean ok = CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                PRIVILEGE);
        return ok ? null : refus("Vous n'avez pas accès aux comptes WhatsApp.");
    }

    private static Response refus(String m) {
        return Response.ok(new JSONObject().put("success", false).put("msg", m).put("message", m).toString()).build();
    }

    @GET
    @Path("comptes")
    public Response comptes() {
        Response r = controle();
        return r != null ? r : Response.ok(service.comptes().toString()).build();
    }

    @POST
    @Path("comptes/{mode}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrer(@PathParam("mode") String mode, String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject saisie;
        try {
            saisie = StringUtils.isBlank(corps) ? new JSONObject() : new JSONObject(corps);
        } catch (RuntimeException e) {
            return refus("Saisie illisible.");
        }
        return Response.ok(service.enregistrer(mode, saisie, utilisateur()).toString()).build();
    }

    @POST
    @Path("test")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response tester(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject o = StringUtils.isBlank(corps) ? new JSONObject() : new JSONObject(corps);
        return Response.ok(service.tester(o.optString("numero"), o.optString("texte"), utilisateur()).toString())
                .build();
    }

    /* ---------------------------------------------- WhatsApp Web : connexion par QR code et regles (07/10) */

    @GET
    @Path("web/etat")
    public Response webEtat() {
        Response r = controle();
        return r != null ? r : Response.ok(web.etat().toString()).build();
    }

    @GET
    @Path("web/qr")
    public Response webQr() {
        Response r = controle();
        return r != null ? r : Response.ok(web.qr().toString()).build();
    }

    @POST
    @Path("web/deconnecter")
    public Response webDeconnecter() {
        Response r = controle();
        return r != null ? r : Response.ok(web.deconnecter().toString()).build();
    }

    @GET
    @Path("web/regles")
    public Response webRegles() {
        Response r = controle();
        return r != null ? r : Response.ok(web.regles().toString()).build();
    }

    @PUT
    @Path("web/regles")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response webEnregistrerRegles(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            return Response.ok(web.enregistrerRegles(new JSONObject(corps), utilisateur()).toString()).build();
        } catch (org.json.JSONException e) {
            return refus("Demande illisible.");
        }
    }

    /* ---------------------------------------------- modeles de l'API officielle (07/10) */

    @GET
    @Path("modeles")
    public Response modeles() {
        Response r = controle();
        return r != null ? r : Response.ok(web.modeles().toString()).build();
    }

    @POST
    @Path("modeles")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerModele(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            return Response.ok(web.enregistrerModele(new JSONObject(corps), utilisateur()).toString()).build();
        } catch (org.json.JSONException e) {
            return refus("Demande illisible.");
        }
    }

    @DELETE
    @Path("modeles/{id}")
    public Response supprimerModele(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : Response.ok(web.supprimerModele(id).toString()).build();
    }

    @POST
    @Path("modeles/{id}/soumettre")
    public Response soumettreModele(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : Response.ok(web.soumettreModele(id, utilisateur()).toString()).build();
    }

    @POST
    @Path("modeles/synchroniser")
    public Response synchroniserModeles() {
        Response r = controle();
        return r != null ? r : Response.ok(web.synchroniserModeles().toString()).build();
    }

    @GET
    @Path("journal")
    public Response journal(@DefaultValue("200") @QueryParam("limite") int limite) {
        Response r = controle();
        return r != null ? r : Response.ok(service.journal(limite).toString()).build();
    }

    /** Abonnement du webhook (Meta) : renvoie hub.challenge en texte brut si le jeton de verification correspond. */
    @GET
    @Path("webhook")
    @Produces(MediaType.TEXT_PLAIN)
    public Response verifier(@QueryParam("hub.mode") String mode, @QueryParam("hub.verify_token") String jeton,
            @QueryParam("hub.challenge") String challenge) {
        String c = service.verifierWebhook(mode, jeton, challenge);
        return c == null ? Response.status(Response.Status.FORBIDDEN).build() : Response.ok(c).build();
    }

    /** Statuts et messages entrants (Meta) : 200 si traite, 401 si la signature ne correspond pas. */
    @POST
    @Path("webhook")
    @Consumes(MediaType.WILDCARD)
    public Response webhook(@HeaderParam("X-Hub-Signature-256") String signature, String corps) {
        return service.webhookMeta(corps, signature) ? Response.ok("{}").build()
                : Response.status(Response.Status.UNAUTHORIZED).build();
    }

    /** Service compagnon WhatsApp Web : {statuts:[...], entrants:[...]}, jeton partage en Authorization: Bearer. */
    @POST
    @Path("webhook-web")
    @Consumes(MediaType.WILDCARD)
    public Response webhookWeb(@HeaderParam("Authorization") String autorisation, String corps) {
        String jeton = autorisation != null && autorisation.startsWith("Bearer ") ? autorisation.substring(7) : null;
        return service.webhookWeb(corps, jeton) ? Response.ok("{}").build()
                : Response.status(Response.Status.UNAUTHORIZED).build();
    }
}
