package util.sms;

import dal.SmsFournisseur;
import dal.enumeration.DlrMode;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import util.SmsDeliveryStatus;

/**
 * Fournisseur SMS LeTexto (Arolitec) : envoi unitaire, solde et interrogation de statut de message.
 *
 * Réf : LeTexto Client API v3 (https://apis.letexto.com) — authentification par clé API statique (Bearer pour l'envoi,
 * paramètre {@code token} pour les consultations). Le numéro est attendu au format international sans "+" (ex.
 * 2250709133208) et le {@code from} est le nom d'expéditeur (sender) validé sur le compte.
 *
 * @author koben
 */
public class LeTextoSmsProvider implements SmsProvider {

    private static final Logger LOG = Logger.getLogger(LeTextoSmsProvider.class.getName());
    public static final String DEFAULT_BASE_URL = "https://apis.letexto.com";

    private final SmsFournisseur config;

    public LeTextoSmsProvider(SmsFournisseur config) {
        this.config = config;
    }

    @Override
    public String getCode() {
        return SmsProviderCatalog.CODE_LETEXTO;
    }

    private String baseUrl() {
        String url = config.getParamValue(SmsProviderCatalog.LETEXTO_BASE_URL);
        if (StringUtils.isBlank(url)) {
            url = DEFAULT_BASE_URL;
        }
        return StringUtils.removeEnd(url.trim(), "/");
    }

    private String apiKey() {
        return StringUtils.trimToEmpty(config.getParamValue(SmsProviderCatalog.LETEXTO_API_KEY));
    }

    private String sender() {
        return StringUtils.trimToEmpty(config.getParamValue(SmsProviderCatalog.LETEXTO_SENDER_NAME));
    }

    private Client newClient() {
        // Timeouts pour ne pas bloquer la transaction si LeTexto est lent.
        return ClientBuilder.newBuilder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    /** "0709133208" / "+2250709133208" / "225 07 09..." -> "2250709133208". */
    static String toInternational(String localNumber) {
        String num = StringUtils.trimToEmpty(localNumber).replaceAll("[\\s.-]", "");
        if (num.startsWith("+")) {
            num = num.substring(1);
        }
        if (!num.startsWith("225")) {
            num = "225" + num;
        }
        return num;
    }

    @Override
    public SmsSendResult send(String localNumber, String message, String customData) {
        if (StringUtils.isBlank(apiKey()) || StringUtils.isBlank(sender())) {
            return SmsSendResult.rejected(0, "CONFIG", "Cle API ou sender LeTexto non configure");
        }
        Client client = newClient();
        try {
            JSONObject body = new JSONObject().put("from", sender()).put("to", toInternational(localNumber))
                    .put("content", message);
            if (StringUtils.isNotBlank(customData)) {
                body.put("customData", customData);
            }
            if (config.getDlrMode() == DlrMode.CALLBACK && StringUtils.isNotBlank(config.getDlrCallbackUrl())) {
                body.put("dlrUrl", config.getDlrCallbackUrl().trim()).put("dlrMethod", "POST");
            }
            Response response = client.target(baseUrl() + "/v1/messages/send").request()
                    .header("Authorization", "Bearer ".concat(apiKey()))
                    .post(Entity.entity(body.toString(), MediaType.APPLICATION_JSON_TYPE));
            int status = response.getStatus();
            String responseBody = response.hasEntity() ? response.readEntity(String.class) : null;
            if (status >= 200 && status < 300) {
                return SmsSendResult.accepted(extractMessageId(responseBody), status);
            }
            return SmsSendResult.rejected(status, "HTTP_" + status, extractErrorMessage(responseBody, status));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec appel LeTexto /messages/send", e);
            return SmsSendResult.rejected(0, "NETWORK", e.getMessage());
        } finally {
            client.close();
        }
    }

    /** Extrait l'identifiant du message de la réponse d'envoi, quel que soit son emballage. */
    private String extractMessageId(String responseBody) {
        if (StringUtils.isBlank(responseBody)) {
            return null;
        }
        try {
            JSONObject json = new JSONObject(responseBody);
            for (String key : new String[] { "id", "messageId", "message_id" }) {
                String direct = json.optString(key, null);
                if (StringUtils.isNotBlank(direct)) {
                    return direct;
                }
            }
            for (String container : new String[] { "data", "message" }) {
                JSONObject inner = json.optJSONObject(container);
                if (inner != null) {
                    for (String key : new String[] { "id", "messageId", "message_id" }) {
                        String value = inner.optString(key, null);
                        if (StringUtils.isNotBlank(value)) {
                            return value;
                        }
                    }
                }
            }
        } catch (Exception ignore) {
            // réponse non JSON : pas d'identifiant exploitable
        }
        return null;
    }

    private String extractErrorMessage(String responseBody, int status) {
        if (StringUtils.isNotBlank(responseBody)) {
            try {
                JSONObject json = new JSONObject(responseBody);
                for (String key : new String[] { "message", "error", "msg", "detail" }) {
                    String value = json.optString(key, null);
                    if (StringUtils.isNotBlank(value)) {
                        return value;
                    }
                }
            } catch (Exception ignore) {
                return StringUtils.abbreviate(responseBody.trim(), 400);
            }
            return StringUtils.abbreviate(responseBody.trim(), 400);
        }
        return "Envoi refuse par LeTexto (HTTP " + status + ")";
    }

    @Override
    public JSONObject balance() {
        if (StringUtils.isBlank(apiKey())) {
            return new JSONObject().put("success", false).put("msg", "Cle API LeTexto non configuree");
        }
        Client client = newClient();
        try {
            Response response = client.target(baseUrl() + "/v1/users/balance").queryParam("token", apiKey()).request()
                    .get();
            int status = response.getStatus();
            String responseBody = response.hasEntity() ? response.readEntity(String.class) : null;
            if (status < 200 || status >= 300) {
                return new JSONObject().put("success", false).put("msg",
                        "Echec consultation du solde LeTexto : " + extractErrorMessage(responseBody, status));
            }
            Double units = extractBalance(responseBody);
            JSONObject result = new JSONObject().put("success", true).put("found", units != null).put("provider",
                    getCode());
            if (units != null) {
                result.put("totalUnits", Math.round(units));
            }
            if (StringUtils.isNotBlank(responseBody)) {
                try {
                    result.put("raw", new JSONObject(responseBody));
                } catch (Exception ignore) {
                    // réponse non JSON : on n'expose que le total
                }
            }
            return result;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec appel LeTexto /users/balance", e);
            return new JSONObject().put("success", false).put("msg", "LeTexto injoignable : " + e.getMessage());
        } finally {
            client.close();
        }
    }

    /** Extrait le nombre d'unités SMS de la réponse de solde, quel que soit son emballage. */
    private Double extractBalance(String responseBody) {
        if (StringUtils.isBlank(responseBody)) {
            return null;
        }
        try {
            JSONObject json = new JSONObject(responseBody);
            for (String key : new String[] { "balance", "credits", "credit", "solde", "units", "sms" }) {
                if (json.has(key) && json.optDouble(key, Double.NaN) == json.optDouble(key, Double.NaN)) {
                    return json.optDouble(key);
                }
            }
            JSONObject data = json.optJSONObject("data");
            if (data != null) {
                for (String key : new String[] { "balance", "credits", "credit", "solde", "units", "sms" }) {
                    if (data.has(key) && data.optDouble(key, Double.NaN) == data.optDouble(key, Double.NaN)) {
                        return data.optDouble(key);
                    }
                }
            }
        } catch (Exception ignore) {
            // réponse non JSON
        }
        return null;
    }

    @Override
    public boolean supportsMessageStatus() {
        return true;
    }

    @Override
    public SmsStatusResult messageStatus(String messageId) {
        if (StringUtils.isBlank(apiKey()) || StringUtils.isBlank(messageId)) {
            return SmsStatusResult.notFound("Cle API ou identifiant de message manquant");
        }
        Client client = newClient();
        try {
            Response response = client.target(baseUrl() + "/v1/messages/" + messageId.trim() + "/status")
                    .queryParam("token", apiKey()).request().get();
            int status = response.getStatus();
            String responseBody = response.hasEntity() ? response.readEntity(String.class) : null;
            if (status < 200 || status >= 300) {
                return SmsStatusResult.notFound(extractErrorMessage(responseBody, status));
            }
            String rawStatus = extractStatus(responseBody);
            if (StringUtils.isBlank(rawStatus)) {
                return SmsStatusResult.notFound("Statut absent de la reponse LeTexto");
            }
            return SmsStatusResult.of(SmsDeliveryStatus.fromLeTexto(rawStatus), rawStatus);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec appel LeTexto /messages/{id}/status", e);
            return SmsStatusResult.notFound("LeTexto injoignable : " + e.getMessage());
        } finally {
            client.close();
        }
    }

    /** Extrait le statut (PENDING/SENT/DELIVERED/FAILED) de la réponse, quel que soit son emballage. */
    private String extractStatus(String responseBody) {
        if (StringUtils.isBlank(responseBody)) {
            return null;
        }
        try {
            JSONObject json = new JSONObject(responseBody);
            // "statuts" est l'orthographe de la documentation LeTexto.
            for (String key : new String[] { "status", "statuts", "statut", "state" }) {
                String value = json.optString(key, null);
                if (StringUtils.isNotBlank(value)) {
                    return value;
                }
            }
            for (String container : new String[] { "data", "message" }) {
                JSONObject inner = json.optJSONObject(container);
                if (inner != null) {
                    for (String key : new String[] { "status", "statuts", "statut", "state" }) {
                        String value = inner.optString(key, null);
                        if (StringUtils.isNotBlank(value)) {
                            return value;
                        }
                    }
                }
            }
        } catch (Exception ignore) {
            // réponse non JSON
        }
        return null;
    }

}
