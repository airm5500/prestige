package util;

import java.util.concurrent.TimeUnit;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;

/**
 * Point d'entrée unique pour l'envoi d'un SMS via l'API Orange.
 *
 * Construit le corps {@code outboundSMSMessageRequest}, exécute l'appel HTTP,
 * lit le corps de réponse et renvoie un {@link OrangeSmsResult} normalisé
 * (code HTTP, resourceURL, code/message d'erreur). Mutualise le code jusqu'ici
 * dupliqué entre {@code SmsImpl} et {@code NotificationScheduledService}.
 *
 * @author koben
 */
public final class OrangeSmsClient {

    private OrangeSmsClient() {
    }

    /**
     * Envoie un SMS à une adresse et retourne le résultat interprété.
     *
     * @param sendUrl       URL d'envoi Orange (sp.pathsmsapisendmessageurl)
     * @param bearerToken   token d'accès OAuth2 (sans le préfixe "Bearer ")
     * @param senderAddress adresse émettrice (sp.senderAddress)
     * @param address       destinataire au format "tel:+225XXXXXXXX"
     * @param message       contenu du SMS
     */
    public static OrangeSmsResult send(String sendUrl, String bearerToken, String senderAddress, String address,
            String message) {
        // Timeouts pour éviter de bloquer la transaction JTA si Orange est lent.
        Client client = ClientBuilder.newBuilder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
        try {
            JSONObject outboundSMSTextMessage = new JSONObject().put("message", message);
            JSONObject outboundSMSMessageRequest = new JSONObject()
                    .put("address", address)
                    .put("senderAddress", senderAddress)
                    .put("outboundSMSTextMessage", outboundSMSTextMessage);
            JSONObject body = new JSONObject().put("outboundSMSMessageRequest", outboundSMSMessageRequest);

            WebTarget target = client.target(sendUrl);
            Response response = target.request()
                    .header("Authorization", "Bearer ".concat(bearerToken))
                    .post(Entity.entity(body.toString(), MediaType.APPLICATION_JSON_TYPE));
            int status = response.getStatus();
            String responseBody = response.hasEntity() ? response.readEntity(String.class) : null;
            return OrangeSmsResult.parse(status, responseBody);
        } finally {
            client.close();
        }
    }
}
