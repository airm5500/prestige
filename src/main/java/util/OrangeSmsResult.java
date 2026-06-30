package util;

import java.util.HashMap;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Résultat normalisé d'un appel à l'API SMS Orange (envoi, token, admin).
 *
 * Centralise l'interprétation de la réponse Orange :
 * <ul>
 * <li>le code HTTP (201 = accepté, 4xx/5xx = erreur) ;</li>
 * <li>le {@code resourceURL} retourné en cas de succès (utile pour le suivi /
 * Delivery Receipt) ;</li>
 * <li>le code d'erreur Orange ({@code messageId} de
 * {@code serviceException}/{@code policyException}) et son libellé.</li>
 * </ul>
 *
 * Référence : https://developer.orange.com/apis/sms-ci/api-reference
 *
 * @author koben
 */
public final class OrangeSmsResult {

    private final int httpStatus;
    private final boolean accepted;
    private final String resourceUrl;
    private final String errorCode;
    private final String errorMessage;
    private final String rawBody;

    private OrangeSmsResult(int httpStatus, boolean accepted, String resourceUrl, String errorCode, String errorMessage,
            String rawBody) {
        this.httpStatus = httpStatus;
        this.accepted = accepted;
        this.resourceUrl = resourceUrl;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.rawBody = rawBody;
    }

    /**
     * Construit un résultat à partir du code HTTP et du corps de réponse Orange.
     */
    public static OrangeSmsResult parse(int httpStatus, String body) {
        boolean accepted = (httpStatus == 201);
        String resourceUrl = null;
        String errorCode = null;
        String errorMessage = null;

        if (StringUtils.isNotBlank(body)) {
            try {
                JSONObject json = new JSONObject(body);
                if (accepted) {
                    resourceUrl = extractResourceUrl(json);
                } else {
                    String[] err = extractError(json);
                    errorCode = err[0];
                    errorMessage = err[1];
                }
            } catch (Exception ignore) {
                // corps non JSON : on garde le brut et le libellé HTTP
            }
        }

        if (!accepted && StringUtils.isBlank(errorMessage)) {
            errorMessage = httpLabel(httpStatus);
        }
        if (!accepted && StringUtils.isBlank(errorCode)) {
            errorCode = "HTTP_" + httpStatus;
        }

        return new OrangeSmsResult(httpStatus, accepted, resourceUrl, errorCode, errorMessage, body);
    }

    private static String extractResourceUrl(JSONObject json) {
        if (json.has("outboundSMSMessageRequest")) {
            JSONObject req = json.optJSONObject("outboundSMSMessageRequest");
            if (req != null) {
                return req.optString("resourceURL", null);
            }
        }
        return json.optString("resourceURL", null);
    }

    /**
     * Extrait le couple [code, message] des structures d'erreur Orange :
     * {@code requestError.serviceException}, {@code requestError.policyException}
     * ou la forme OAuth {@code {"error":...,"error_description":...}}.
     */
    private static String[] extractError(JSONObject json) {
        JSONObject exception = null;
        if (json.has("requestError")) {
            JSONObject requestError = json.optJSONObject("requestError");
            if (requestError != null) {
                if (requestError.has("serviceException")) {
                    exception = requestError.optJSONObject("serviceException");
                } else if (requestError.has("policyException")) {
                    exception = requestError.optJSONObject("policyException");
                }
            }
        }
        if (exception != null) {
            String messageId = exception.optString("messageId", null);
            String text = resolveVariables(exception.optString("text", null),
                    exception.optJSONArray("variables"));
            String label = ORANGE_CODES.get(messageId);
            String message = StringUtils.isNotBlank(label)
                    ? label + (StringUtils.isNotBlank(text) ? " (" + text + ")" : "")
                    : text;
            return new String[] { messageId, message };
        }
        // Forme OAuth : token refusé / client non autorisé
        if (json.has("error")) {
            String code = json.optString("error", null);
            String desc = json.optString("error_description", null);
            return new String[] { code, StringUtils.isNotBlank(desc) ? desc : code };
        }
        // Forme alternative avec "fault"
        if (json.has("fault")) {
            JSONObject fault = json.optJSONObject("fault");
            if (fault != null) {
                return new String[] { fault.optString("code", null), fault.optString("faultstring", null) };
            }
        }
        return new String[] { null, null };
    }

    /** Remplace %1, %2... dans le texte Orange par les valeurs de "variables". */
    private static String resolveVariables(String text, JSONArray variables) {
        if (StringUtils.isBlank(text) || variables == null) {
            return text;
        }
        String result = text;
        for (int i = 0; i < variables.length(); i++) {
            result = result.replace("%" + (i + 1), String.valueOf(variables.opt(i)));
        }
        return result;
    }

    /** Libellé lisible d'un statut HTTP renvoyé par Orange. */
    public static String httpLabel(int status) {
        switch (status) {
            case 200:
                return "OK";
            case 201:
                return "Créé / accepté par Orange (pas encore livré au terminal)";
            case 400:
                return "Requête invalide (paramètre/sender/numéro incorrect)";
            case 401:
                return "Non authentifié : token expiré ou invalide";
            case 403:
                return "Interdit : droits insuffisants, sender non autorisé ou quota/solde épuisé";
            case 404:
                return "Ressource introuvable (URL d'envoi ou senderAddress incorrect)";
            case 405:
                return "Méthode HTTP non autorisée";
            case 409:
                return "Conflit";
            case 429:
                return "Trop de requêtes : quota/débit dépassé";
            case 500:
                return "Erreur interne Orange";
            case 502:
                return "Mauvaise passerelle Orange";
            case 503:
                return "Service Orange indisponible";
            default:
                return "Code HTTP " + status;
        }
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public boolean isAccepted() {
        return accepted;
    }

    public String getResourceUrl() {
        return resourceUrl;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getRawBody() {
        return rawBody;
    }

    /** Trace courte et exploitable pour les logs. */
    public String toLog() {
        if (accepted) {
            return "ACCEPTE(201) resourceURL=" + resourceUrl;
        }
        return "ECHEC(http=" + httpStatus + ", code=" + errorCode + ", msg=" + errorMessage + ")";
    }

    /**
     * Catalogue des codes d'erreur Orange documentés
     * (https://developer.orange.com/apis/sms-ci/api-reference) avec un libellé FR.
     */
    private static final Map<String, String> ORANGE_CODES = new HashMap<>();

    static {
        ORANGE_CODES.put("SVC0001", "Erreur de service générique");
        ORANGE_CODES.put("SVC0002", "Valeur d'entrée invalide");
        ORANGE_CODES.put("SVC0003", "Valeur d'entrée invalide pour un attribut");
        ORANGE_CODES.put("SVC0004", "Aucune adresse destinataire valide fournie");
        ORANGE_CODES.put("SVC0005", "Identifiant de corrélation déjà utilisé");
        ORANGE_CODES.put("SVC0006", "Attribut(s) invalide(s)");
        ORANGE_CODES.put("SVC0007", "Format d'adresse invalide");
        ORANGE_CODES.put("SVC0008", "Empreinte (fingerprint) invalide");
        ORANGE_CODES.put("SVC0270", "Type de Delivery Receipt non supporté");
        ORANGE_CODES.put("POL0001", "Erreur de politique générique");
        ORANGE_CODES.put("POL0002", "Échec de vérification de confidentialité");
        ORANGE_CODES.put("POL0003", "Trop d'adresses destinataires");
        ORANGE_CODES.put("POL0004", "Mode de facturation non supporté");
        ORANGE_CODES.put("POL0005", "Trop de pièces dans le message");
        ORANGE_CODES.put("POL0006", "Mode de notification non supporté");
        ORANGE_CODES.put("POL0007", "Adresses de notification multiples non supportées");
        ORANGE_CODES.put("POL0008", "Compte de charge invalide");
        ORANGE_CODES.put("POL0009", "Quota dépassé ou abonné non provisionné pour le SMS");
        ORANGE_CODES.put("POL0011", "Type de média non supporté");
        ORANGE_CODES.put("POL0012", "Trop de destinataires");
        ORANGE_CODES.put("POL0013", "Trop de messages envoyés (débit dépassé)");
        ORANGE_CODES.put("POL0050", "Crédit/solde insuffisant pour envoyer le message");
        ORANGE_CODES.put("POL1009", "Application non souscrite à l'API");
        ORANGE_CODES.put("invalid_client", "Identifiants client (clientId/secret) invalides");
        ORANGE_CODES.put("invalid_grant", "Autorisation refusée (grant invalide)");
        ORANGE_CODES.put("invalid_token", "Token d'accès invalide ou expiré");
    }
}
