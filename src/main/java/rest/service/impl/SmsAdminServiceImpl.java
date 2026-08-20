package rest.service.impl;

import dal.TParameters;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SmsAdminService;
import rest.service.SmsService;
import util.AppParameters;
import util.OrangeSmsResult;

/**
 * Implémentation des appels d'administration Orange (solde, statistiques, achats, souscriptions Delivery Receipt).
 * Réutilise le token géré par {@link SmsService} et normalise les réponses (succès/erreur) via {@link OrangeSmsResult}.
 *
 * @author koben
 */
@Stateless
public class SmsAdminServiceImpl implements SmsAdminService {

    private static final Logger LOG = Logger.getLogger(SmsAdminServiceImpl.class.getName());
    private final AppParameters sp = AppParameters.getInstance();
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SmsService smsService;

    /**
     * URL de callback DR effective : paramètre en base si renseigné, sinon valeur du fichier dicisms.properties.
     */
    private String resolveCallbackUrl() {
        String fromDb = readCallbackUrlParam();
        if (StringUtils.isNotBlank(fromDb)) {
            return fromDb.trim();
        }
        return sp.smsdrcallbackurl;
    }

    private String readCallbackUrlParam() {
        return readParam(util.Constant.KEY_SMS_DR_CALLBACK_URL);
    }

    private String readCallbackSecret() {
        return readParam(util.Constant.KEY_SMS_DR_CALLBACK_SECRET);
    }

    private String readParam(String key) {
        try {
            TParameters p = em.find(TParameters.class, key);
            return p != null ? p.getStrVALUE() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject getCallbackUrlInfo() {
        String fromDb = readCallbackUrlParam();
        String url;
        String source;
        if (StringUtils.isNotBlank(fromDb)) {
            url = fromDb.trim();
            source = "parametre";
        } else {
            url = sp.smsdrcallbackurl;
            source = "fichier";
        }
        String secret = StringUtils.trimToEmpty(readCallbackSecret());
        return new JSONObject().put("success", true).put("url", url != null ? url : "").put("source", source)
                .put("secret", secret).put("protected", StringUtils.isNotBlank(secret));
    }

    @Override
    public JSONObject saveCallbackConfig(String url, String secret) {
        try {
            if (url != null) {
                upsertParam(util.Constant.KEY_SMS_DR_CALLBACK_URL, StringUtils.trimToEmpty(url),
                        "URL publique appelee par Orange pour les accuses de reception SMS");
            }
            if (secret != null) {
                upsertParam(util.Constant.KEY_SMS_DR_CALLBACK_SECRET, StringUtils.trimToEmpty(secret),
                        "Jeton secret du callback DR (parametre ?key=)");
            }
            return new JSONObject().put("success", true).put("msg", "Configuration du callback DR enregistrée.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec enregistrement configuration callback DR", e);
            return new JSONObject().put("success", false).put("msg", "Echec de l'enregistrement.");
        }
    }

    private void upsertParam(String key, String value, String description) {
        TParameters p = em.find(TParameters.class, key);
        if (p == null) {
            p = new TParameters(key);
            p.setStrDESCRIPTION(description);
            // Constante et non chaine en dur : cette ligne ecrivait "SYSTEM" sans le E, creant une
            // seconde orthographe du meme type dans t_parameters (cf. migration V6.8.8).
            p.setStrTYPE(util.Constant.PARAMETER_SYSTEM);
            p.setStrSTATUT("enable");
            p.setDtCREATED(new Date());
            p.setStrVALUE(value);
            em.persist(p);
        } else {
            p.setStrVALUE(value);
            p.setDtUPDATED(new Date());
            em.merge(p);
        }
    }

    /** Ajoute ?key=secret (ou &key=) à l'URL de callback si un secret est défini. */
    private String appendSecret(String url, String secret) {
        if (StringUtils.isBlank(secret)) {
            return url;
        }
        String encoded = URLEncoder.encode(secret.trim(), StandardCharsets.UTF_8);
        return url + (url.contains("?") ? "&" : "?") + "key=" + encoded;
    }

    @Override
    public boolean isCallbackKeyValid(String providedKey) {
        String secret = StringUtils.trimToEmpty(readCallbackSecret());
        if (StringUtils.isBlank(secret)) {
            return true; // protection désactivée
        }
        return secret.equals(StringUtils.trimToEmpty(providedKey));
    }

    @Override
    public JSONObject getContracts() {
        return doGet(sp.pathsmsapiadminbaseurl + "/contracts", "contrats");
    }

    @Override
    public JSONObject getBalanceSummary() {
        JSONObject contracts = getContracts();
        if (!contracts.optBoolean("success", false)) {
            return contracts; // propage l'erreur (token, http, code Orange...)
        }
        JSONArray items = new JSONArray();
        long[] total = { 0L };
        boolean[] found = { false };
        collectUnits(contracts.opt("data"), items, total, found);

        JSONObject result = new JSONObject().put("success", true).put("found", found[0]).put("totalUnits", total[0])
                .put("items", items);
        if (!found[0]) {
            // Format inattendu : on renvoie le brut pour diagnostic.
            result.put("raw", contracts.opt("data"));
        }
        return result;
    }

    /** Parcourt récursivement la réponse contrats pour additionner les unités. */
    private void collectUnits(Object node, JSONArray items, long[] total, boolean[] found) {
        if (node instanceof JSONObject) {
            JSONObject obj = (JSONObject) node;
            Long units = extractUnits(obj);
            if (units != null) {
                found[0] = true;
                total[0] += units;
                items.put(new JSONObject().put("units", units).put("country", obj.optString("country", ""))
                        .put("service", obj.optString("service", "")).put("expiration", obj.has("expirationDate")
                                ? obj.optString("expirationDate", "") : obj.optString("expiration", "")));
            }
            for (String key : obj.keySet()) {
                collectUnits(obj.opt(key), items, total, found);
            }
        } else if (node instanceof JSONArray) {
            JSONArray arr = (JSONArray) node;
            for (int i = 0; i < arr.length(); i++) {
                collectUnits(arr.opt(i), items, total, found);
            }
        }
    }

    private Long extractUnits(JSONObject obj) {
        String[] keys = { "availableUnits", "remainingUnits", "remaining", "units", "availableUnit" };
        for (String k : keys) {
            if (obj.has(k)) {
                try {
                    return obj.getLong(k);
                } catch (Exception e) {
                    try {
                        return (long) Double.parseDouble(obj.getString(k));
                    } catch (Exception ignore) {
                        // clé présente mais non numérique : on continue
                    }
                }
            }
        }
        return null;
    }

    @Override
    public JSONObject getStatistics() {
        return doGet(sp.pathsmsapiadminbaseurl + "/statistics", "statistiques");
    }

    @Override
    public JSONObject getPurchaseOrders() {
        return doGet(sp.pathsmsapiadminbaseurl + "/purchaseorders", "bons d'achat");
    }

    @Override
    public JSONObject getDeliveryReceiptSubscriptions() {
        return doGet(sp.pathsmsapisubscriptionurl, "souscriptions DR");
    }

    @Override
    public JSONObject createDeliveryReceiptSubscription() {
        String callbackUrl = resolveCallbackUrl();
        if (StringUtils.isBlank(callbackUrl)) {
            return error("L'URL de callback DR n'est pas configurée (paramètre KEY_SMS_DR_CALLBACK_URL "
                    + "ou smsdrcallbackurl dans dicisms.properties)", 0, null);
        }
        String token = smsService.getValidAccessToken();
        if (StringUtils.isBlank(token)) {
            return error("Token Orange indisponible", 0, null);
        }
        Client client = ClientBuilder.newClient();
        try {
            JSONObject callbackReference = new JSONObject().put("notifyURL",
                    appendSecret(callbackUrl, readCallbackSecret()));
            JSONObject subscription = new JSONObject().put("callbackReference", callbackReference);
            JSONObject body = new JSONObject().put("deliveryReceiptSubscription", subscription);

            WebTarget target = client.target(sp.pathsmsapisubscriptionurl);
            Response response = target.request(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer ".concat(token))
                    .post(Entity.entity(body.toString(), MediaType.APPLICATION_JSON_TYPE));
            return normalize(response, "création souscription DR");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec création souscription DR", e);
            return error(e.getMessage(), 0, null);
        } finally {
            client.close();
        }
    }

    @Override
    public JSONObject deleteDeliveryReceiptSubscription(String subscriptionId) {
        if (StringUtils.isBlank(subscriptionId)) {
            return error("Identifiant de souscription manquant", 0, null);
        }
        String token = smsService.getValidAccessToken();
        if (StringUtils.isBlank(token)) {
            return error("Token Orange indisponible", 0, null);
        }
        Client client = ClientBuilder.newClient();
        try {
            WebTarget target = client.target(sp.pathsmsapisubscriptionurl + "/" + subscriptionId);
            Response response = target.request(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer ".concat(token)).delete();
            return normalize(response, "suppression souscription DR");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec suppression souscription DR", e);
            return error(e.getMessage(), 0, null);
        } finally {
            client.close();
        }
    }

    /** GET générique sur un endpoint admin Orange. */
    private JSONObject doGet(String url, String libelle) {
        String token = smsService.getValidAccessToken();
        if (StringUtils.isBlank(token)) {
            return error("Token Orange indisponible", 0, null);
        }
        Client client = ClientBuilder.newClient();
        try {
            WebTarget target = client.target(url);
            Response response = target.request(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer ".concat(token)).get();
            return normalize(response, libelle);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec consultation " + libelle, e);
            return error(e.getMessage(), 0, null);
        } finally {
            client.close();
        }
    }

    /** Transforme une réponse Orange en {success, httpStatus, data|code|msg}. */
    private JSONObject normalize(Response response, String libelle) {
        int status = response.getStatus();
        String body = response.hasEntity() ? response.readEntity(String.class) : null;
        LOG.log(Level.INFO, "SMS admin [{0}] >>> http={1}, body={2}", new Object[] { libelle, status, body });
        if (status >= 200 && status < 300) {
            JSONObject result = new JSONObject().put("success", true).put("httpStatus", status);
            result.put("data", toJson(body));
            return result;
        }
        OrangeSmsResult parsed = OrangeSmsResult.parse(status, body);
        return error(parsed.getErrorMessage(), status, parsed.getErrorCode());
    }

    private JSONObject error(String msg, int httpStatus, String code) {
        JSONObject result = new JSONObject().put("success", false).put("httpStatus", httpStatus).put("msg",
                msg != null ? msg : "Erreur inconnue");
        if (code != null) {
            result.put("code", code);
        }
        return result;
    }

    /** Parse le corps en JSONObject/JSONArray si possible, sinon renvoie la chaîne. */
    private Object toJson(String body) {
        if (StringUtils.isBlank(body)) {
            return JSONObject.NULL;
        }
        String trimmed = body.trim();
        try {
            if (trimmed.startsWith("[")) {
                return new JSONArray(trimmed);
            }
            return new JSONObject(trimmed);
        } catch (Exception e) {
            return body;
        }
    }

}
