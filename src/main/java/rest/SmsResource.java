package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import rest.service.SmsAdminService;
import rest.service.SmsService;

/**
 * Endpoints SMS Orange : consultation du solde / statistiques / achats, gestion des souscriptions Delivery Receipt (DR)
 * et réception du callback DR.
 *
 * L'authentification des endpoints de consultation/gestion est assurée par le {@code AuthenticationFilter} global ;
 * seul {@code dr-callback} est exempté (il est appelé par Orange, sans session) via {@code SKIP_PATHS}.
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
    @EJB
    private rest.service.SmsFournisseurService smsFournisseurService;
    @EJB
    private rest.service.impl.SmsProviderFactory smsProviderFactory;

    /** Solde / contrats SMS (bundle restant, expiration) - réponse Orange brute. */
    @GET
    @Path("balance")
    public Response balance() {
        return Response.ok(smsAdminService.getContracts().toString()).build();
    }

    /**
     * Solde SMS résumé et prêt à afficher (total d'unités + détail par contrat). Interroge le fournisseur en vigueur :
     * API admin pour Orange, API de solde du fournisseur sinon.
     */
    @GET
    @Path("solde")
    public Response solde() {
        dal.SmsFournisseur enVigueur = smsFournisseurService.getEnVigueur();
        if (enVigueur != null && !util.sms.SmsProviderCatalog.CODE_ORANGE.equals(enVigueur.getCode())) {
            util.sms.SmsProvider provider = smsProviderFactory.forFournisseur(enVigueur);
            if (provider != null) {
                return Response.ok(provider.balance().toString()).build();
            }
        }
        return Response.ok(
                smsAdminService.getBalanceSummary().put("provider", util.sms.SmsProviderCatalog.CODE_ORANGE).toString())
                .build();
    }

    /**
     * Rafraîchit à la demande les statuts de livraison des SMS en attente (mode POLLING du fournisseur en vigueur).
     * Déclenché par l'écran Notifications lors de la consultation du solde.
     */
    @POST
    @Path("refresh-statuts")
    public Response refreshStatuts() {
        return Response.ok(smsService.refreshDeliveryStatuses().toString()).build();
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

    /** Enregistre l'URL et/ou le jeton secret du callback DR dans les paramètres. */
    @POST
    @Path("dr-callback-url")
    public Response saveDrCallbackUrl(String body) {
        String url = null;
        String secret = null;
        try {
            org.json.JSONObject json = new org.json.JSONObject(body);
            url = json.has("url") ? json.optString("url", "") : null;
            secret = json.has("secret") ? json.optString("secret", "") : null;
        } catch (Exception ignore) {
            // corps vide ou invalide
        }
        return Response.ok(smsAdminService.saveCallbackConfig(url, secret).toString()).build();
    }

    /** Supprime une souscription Delivery Receipt. */
    @DELETE
    @Path("dr-subscriptions/{id}")
    public Response deleteDrSubscription(@PathParam("id") String id) {
        return Response.ok(smsAdminService.deleteDeliveryReceiptSubscription(id).toString()).build();
    }

    /**
     * Callback appelé par Orange pour notifier le statut de livraison d'un SMS. PUBLIC (pas de session) : on acquitte
     * systématiquement (204) pour éviter les ré-émissions côté Orange.
     */
    @POST
    @Path("dr-callback")
    public Response deliveryReceiptCallback(@QueryParam("key") String key, String payload) {
        if (!smsAdminService.isCallbackKeyValid(key)) {
            // Jeton absent/incorrect : on refuse sans traiter.
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        try {
            smsService.handleDeliveryReceipt(payload);
        } catch (Exception ignore) {
            // on acquitte quand même
        }
        return Response.noContent().build();
    }

}
