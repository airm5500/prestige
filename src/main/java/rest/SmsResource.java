package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.service.SmsAdminService;
import rest.service.SmsService;

/**
 * Endpoints SMS Orange : consultation du solde / statistiques / achats,
 * gestion des souscriptions Delivery Receipt (DR) et réception du callback DR.
 *
 * L'authentification des endpoints de consultation/gestion est assurée par le
 * {@code AuthenticationFilter} global ; seul {@code dr-callback} est exempté
 * (il est appelé par Orange, sans session) via {@code SKIP_PATHS}.
 *
 * @author koben
 */
@Path("v1/sms")
@Produces("application/json")
@Consumes("application/json")
public class SmsResource {

    @EJB
    private SmsAdminService smsAdminService;
    @EJB
    private SmsService smsService;

    /** Solde / contrats SMS (bundle restant, expiration) - réponse Orange brute. */
    @GET
    @Path("balance")
    public Response balance() {
        return Response.ok(smsAdminService.getContracts().toString()).build();
    }

    /** Solde SMS résumé et prêt à afficher (total d'unités + détail par contrat). */
    @GET
    @Path("solde")
    public Response solde() {
        return Response.ok(smsAdminService.getBalanceSummary().toString()).build();
    }

    /** Statistiques d'utilisation SMS. */
    @GET
    @Path("statistics")
    public Response statistics() {
        return Response.ok(smsAdminService.getStatistics().toString()).build();
    }

    /** Historique des achats SMS. */
    @GET
    @Path("purchase-orders")
    public Response purchaseOrders() {
        return Response.ok(smsAdminService.getPurchaseOrders().toString()).build();
    }

    /** Liste les souscriptions Delivery Receipt. */
    @GET
    @Path("dr-subscriptions")
    public Response listDrSubscriptions() {
        return Response.ok(smsAdminService.getDeliveryReceiptSubscriptions().toString()).build();
    }

    /** Crée une souscription Delivery Receipt (utilise l'URL de callback configurée). */
    @POST
    @Path("dr-subscriptions")
    public Response createDrSubscription() {
        return Response.ok(smsAdminService.createDeliveryReceiptSubscription().toString()).build();
    }

    /** URL de callback DR actuelle (et sa source : paramètre base ou fichier). */
    @GET
    @Path("dr-callback-url")
    public Response getDrCallbackUrl() {
        return Response.ok(smsAdminService.getCallbackUrlInfo().toString()).build();
    }

    /** Enregistre l'URL de callback DR dans les paramètres (base). */
    @POST
    @Path("dr-callback-url")
    public Response saveDrCallbackUrl(String body) {
        String url = "";
        try {
            url = new org.json.JSONObject(body).optString("url", "");
        } catch (Exception ignore) {
            // corps vide ou invalide
        }
        return Response.ok(smsAdminService.saveCallbackUrl(url).toString()).build();
    }

    /** Supprime une souscription Delivery Receipt. */
    @DELETE
    @Path("dr-subscriptions/{id}")
    public Response deleteDrSubscription(@PathParam("id") String id) {
        return Response.ok(smsAdminService.deleteDeliveryReceiptSubscription(id).toString()).build();
    }

    /**
     * Callback appelé par Orange pour notifier le statut de livraison d'un SMS.
     * PUBLIC (pas de session) : on acquitte systématiquement (204) pour éviter
     * les ré-émissions côté Orange.
     */
    @POST
    @Path("dr-callback")
    public Response deliveryReceiptCallback(String payload) {
        try {
            smsService.handleDeliveryReceipt(payload);
        } catch (Exception ignore) {
            // on acquitte quand même
        }
        return Response.noContent().build();
    }

}
