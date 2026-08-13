/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.Notification;
import dal.NotificationClient;
import dal.SmsToken;
import dal.TClient;
import dal.enumeration.Statut;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedHashMap;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SmsFournisseurService;
import rest.service.SmsService;
import util.Constant;
import util.DateConverter;
import util.AppParameters;
import util.SmsDeliveryStatus;
import util.SmsUserMessage;
import util.sms.SmsProvider;
import util.sms.SmsProviderCatalog;
import util.sms.SmsSendResult;

/**
 *
 * @author koben
 */
@Stateless
public class SmsImpl implements SmsService {

    private static final Logger LOG = Logger.getLogger(SmsImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    private final AppParameters sp = AppParameters.getInstance();
    @EJB
    private SmsProviderFactory smsProviderFactory;
    @EJB
    private SmsFournisseurService smsFournisseurService;

    @Override
    public JSONObject findAccessToken() {
        try {
            Client client = ClientBuilder.newClient();

            MultivaluedMap<String, String> formdata = new MultivaluedHashMap<>();

            formdata.add("grant_type", DateConverter.GRANT_TYPE);
            WebTarget myResource = client.target(tokenEndpoint());
            Response response = myResource.request(MediaType.APPLICATION_JSON)
                    .header("Authorization", StringUtils.isNotEmpty(getBasicHeader()) ? getBasicHeader() : sp.header)
                    .post(Entity.entity(formdata, MediaType.APPLICATION_FORM_URLENCODED), Response.class);
            if (response.getStatus() == 200) {
                return new JSONObject().put("success", true).put("data",
                        new JSONObject(response.readEntity(String.class)));
            }

            return new JSONObject().put("success", false).put("msg", "Le token n'a pad pu être géneré ");
        } catch (JSONException e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false).put("msg", "Le token n'a pad pu être géneré ");
        }
    }

    public String getAccessTokend() {

        return sp.accesstoken;
    }

    /** URL du token OAuth2 : configuration Orange en base si renseignée, sinon dicisms.properties. */
    private String tokenEndpoint() {
        try {
            dal.SmsFournisseur orange = smsFournisseurService.findByCode(SmsProviderCatalog.CODE_ORANGE);
            if (orange != null) {
                String endpoint = orange.getParamValue(SmsProviderCatalog.ORANGE_TOKEN_ENDPOINT);
                if (StringUtils.isNotBlank(endpoint)) {
                    return endpoint.trim();
                }
            }
        } catch (Exception ignore) {
            // repli sur le fichier de propriétés
        }
        return sp.pathsmsapitokenendpoint;
    }

    /**
     * En-tête Basic d'authentification au token endpoint : construit depuis le client_id/client_secret configurés en
     * base si présents, sinon en-tête mémorisé sur le token, sinon dicisms.properties.
     */
    private String getBasicHeader() {
        try {
            dal.SmsFournisseur orange = smsFournisseurService.findByCode(SmsProviderCatalog.CODE_ORANGE);
            if (orange != null) {
                String clientId = orange.getParamValue(SmsProviderCatalog.ORANGE_CLIENT_ID);
                String clientSecret = orange.getParamValue(SmsProviderCatalog.ORANGE_CLIENT_SECRET);
                if (StringUtils.isNotBlank(clientId) && StringUtils.isNotBlank(clientSecret)) {
                    return "Basic ".concat(
                            java.util.Base64.getEncoder().encodeToString((clientId.trim() + ":" + clientSecret.trim())
                                    .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                }
            }
        } catch (Exception ignore) {
            // repli sur l'en-tête mémorisé
        }
        try {
            return em.find(SmsToken.class, "sms").getHeader();

        } catch (Exception e) {
            return "";
        }
    }

    private SmsToken getSmsToken() {
        try {
            return em.find(SmsToken.class, "sms");

        } catch (Exception e) {
            return null;
        }
    }

    private SmsToken getOrupdateSmsToken() {
        SmsToken smsToken = getSmsToken();
        if (smsToken == null) {
            String token = getAccessToken();
            if (StringUtils.isNotEmpty(token)) {
                smsToken = new SmsToken();
                smsToken.setId("sms");
                JSONObject data = new JSONObject(token);
                smsToken.setAccessToken(data.getString("access_token"));
                smsToken.setExpiresIn(data.getInt("expires_in"));
                String basicHeader = getBasicHeader();
                smsToken.setHeader(StringUtils.isNotEmpty(basicHeader) ? basicHeader : sp.header);
                smsToken.setCreateDate(LocalDateTime.now());
                em.persist(smsToken);
            }

        } else {
            if (smsToken.getCreateDate()
                    .isBefore(LocalDateTime.now().minus(smsToken.getExpiresIn(), ChronoUnit.SECONDS))) {
                JSONObject json = findAccessToken();
                if (json.has("success") && json.getBoolean("success")) {
                    JSONObject data = json.getJSONObject("data");
                    smsToken.setAccessToken(data.getString("access_token"));
                    smsToken.setExpiresIn(data.getInt("expires_in"));
                    smsToken.setCreateDate(LocalDateTime.now());
                    em.merge(smsToken);
                }
            }
        }
        return smsToken;
    }

    private String getAccessToken() {
        try {
            Client client = ClientBuilder.newClient();

            MultivaluedMap<String, String> formdata = new MultivaluedHashMap<>();
            formdata.add("grant_type", Constant.GRANT_TYPE);
            WebTarget myResource = client.target(tokenEndpoint());
            Response response = myResource.request(MediaType.APPLICATION_JSON)
                    .header("Authorization", StringUtils.isNotEmpty(getBasicHeader()) ? getBasicHeader() : sp.header)
                    .post(Entity.entity(formdata, MediaType.APPLICATION_FORM_URLENCODED), Response.class);
            if (response.getStatus() == 200) {
                return response.readEntity(String.class);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return null;
    }

    @Override
    public void sendSMS(Notification notification) {
        SmsProvider provider = smsProviderFactory.current();
        if (provider == null) {
            throw new RuntimeException("Aucun fournisseur SMS en vigueur n'est pris en charge");
        }

        try {
            String message = notification.getMessage();
            Collection<NotificationClient> toClients = notification.getNotificationClients();
            int sent = 0;
            int total = 0;
            for (NotificationClient toClient : toClients) {
                TClient tc = toClient.getClient();
                if (tc == null || StringUtils.isEmpty(tc.getStrADRESSE())) {
                    continue;
                }
                total++;
                // customData = id du destinataire : corrélation exacte des accusés de réception.
                SmsSendResult result = provider.send(tc.getStrADRESSE(), message, toClient.getId());
                applyResultToClient(toClient, result, provider.getCode());
                LOG.log(Level.INFO, "sendSMS >>> notification={0}, client={1}, numero={2}, fournisseur={3}, {4}",
                        new Object[] { notification.getId(), toClient.getId(), tc.getStrADRESSE(), provider.getCode(),
                                result.toLog() });
                if (result.isAccepted()) {
                    sent++;
                }
            }
            notification.setNumberAttempt(notification.getNumberAttempt() + 1);
            notification.setModfiedAt(LocalDateTime.now());
            updateNotificationStatut(notification, sent, total);

            LOG.log(Level.INFO, "SMS acceptes par {0} ====== {1}/{2} (notification {3})",
                    new Object[] { provider.getCode(), sent, total, notification.getId() });
            em.merge(notification);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, "Echec envoi SMS notification " + notification.getId(), ex);
        }

    }

    /** Reporte le résultat du fournisseur sur le destinataire (statut, id de suivi, erreur). */
    private void applyResultToClient(NotificationClient toClient, SmsSendResult result, String providerCode) {
        toClient.setLastHttpStatus(result.getHttpStatus());
        toClient.setFournisseurCode(providerCode);
        if (result.isAccepted()) {
            toClient.setStatut(Statut.SENT);
            toClient.setSentAt(LocalDateTime.now());
            toClient.setResourceUrl(result.getMessageId());
            toClient.setDeliveryStatus(SmsProviderCatalog.CODE_ORANGE.equals(providerCode)
                    ? SmsDeliveryStatus.ACCEPTED_BY_ORANGE : SmsDeliveryStatus.ACCEPTED_BY_PROVIDER);
            toClient.setErrorCode(null);
            toClient.setErrorMessage(null);
        } else {
            toClient.setErrorCode(result.getErrorCode());
            toClient.setErrorMessage(result.getErrorMessage());
        }
    }

    /** SENT si tous les destinataires ont été acceptés, LOCK après 3 tentatives. */
    private void updateNotificationStatut(Notification notification, int sent, int total) {
        if (total > 0 && sent == total) {
            notification.setStatut(Statut.SENT);
        } else if (notification.getNumberAttempt() >= 3) {
            notification.setStatut(Statut.LOCK);
        }
    }

    @Override
    @Asynchronous
    public void sendSMSByNotificationIdAsync(String notificationId) {
        sendSMSById(notificationId);
    }

    @Override
    public void sendSMSById(String notificationId) {
        try {
            Notification notification = em.find(Notification.class, notificationId);
            if (notification == null) {
                LOG.log(Level.WARNING, "Envoi SMS ignore : notification introuvable {0}", notificationId);
                return;
            }
            if (notification.getStatut() == Statut.SENT) {
                return;
            }
            sendSMS(notification);
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, "Echec envoi SMS notification " + notificationId, ex);
        }
    }

    @Override
    public JSONObject resendSMSById(String notificationId) {
        Notification notification = em.find(Notification.class, notificationId);
        if (notification == null) {
            LOG.log(Level.WARNING, "Renvoi manuel ignore : notification introuvable {0}", notificationId);
            return new JSONObject().put("success", false).put("statut", JSONObject.NULL).put("userMessage",
                    "Notification introuvable.");
        }
        // Renvoi forcé : on ne court-circuite pas sur le statut SENT.
        sendSMS(notification);
        return buildResendResult(notification);
    }

    /** Construit le compte rendu du renvoi à partir de l'état des destinataires. */
    private JSONObject buildResendResult(Notification notification) {
        boolean accepted = notification.getStatut() == Statut.SENT;
        String statut = notification.getStatut() != null ? notification.getStatut().name() : null;
        String code = null;
        String orangeMessage = null;
        if (!accepted) {
            for (NotificationClient c : notification.getNotificationClients()) {
                boolean clientOk = SmsDeliveryStatus.ACCEPTED_BY_ORANGE.equals(c.getDeliveryStatus())
                        || SmsDeliveryStatus.ACCEPTED_BY_PROVIDER.equals(c.getDeliveryStatus())
                        || c.getStatut() == Statut.SENT;
                if (!clientOk && StringUtils.isNotBlank(c.getErrorMessage())) {
                    code = c.getErrorCode();
                    orangeMessage = c.getErrorMessage();
                    break;
                }
            }
        }
        String userMessage = accepted
                ? "SMS accepté par le fournisseur. La livraison sera confirmée par les accusés de réception."
                : SmsUserMessage.friendly(code, orangeMessage);
        return new JSONObject().put("success", accepted).put("statut", statut != null ? statut : JSONObject.NULL)
                .put("code", code != null ? code : JSONObject.NULL)
                .put("orangeMessage", orangeMessage != null ? orangeMessage : JSONObject.NULL)
                .put("userMessage", userMessage);
    }

    @Override
    public String getValidAccessToken() {
        SmsToken smsToken = getOrupdateSmsToken();
        return smsToken != null ? smsToken.getAccessToken() : null;
    }

    @Override
    public boolean handleDeliveryReceipt(String rawPayload) {
        if (StringUtils.isBlank(rawPayload)) {
            return false;
        }
        try {
            JSONObject json = new JSONObject(rawPayload);
            JSONObject deliveryInfo = extractDeliveryInfo(json);
            if (deliveryInfo == null) {
                if (isLeTextoReceipt(json)) {
                    return handleLeTextoReceipt(json);
                }
                LOG.log(Level.WARNING, "DR ignore : format non reconnu {0}", rawPayload);
                return false;
            }
            String address = deliveryInfo.optString("address", null);
            String orangeStatus = deliveryInfo.optString("deliveryStatus", null);
            String resourceUrl = deliveryInfo.optString("resourceURL", null);
            String normalized = SmsDeliveryStatus.fromOrange(orangeStatus);

            NotificationClient target = findClientForDeliveryReceipt(resourceUrl, address);
            if (target == null) {
                LOG.log(Level.WARNING, "DR sans destinataire correspondant (address={0}, resourceURL={1})",
                        new Object[] { address, resourceUrl });
                return false;
            }
            target.setDeliveryStatus(normalized);
            if (SmsDeliveryStatus.DELIVERY_IMPOSSIBLE.equals(normalized)) {
                target.setErrorMessage("Livraison impossible (Delivery Receipt Orange)");
            }
            em.merge(target);
            LOG.log(Level.INFO, "DR applique : client={0}, address={1}, status={2}",
                    new Object[] { target.getId(), address, normalized });
            return true;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec traitement Delivery Receipt", e);
            return false;
        }
    }

    /** Vrai si le payload ressemble à un DLR LeTexto : {id, statuts} (+ customData). */
    private boolean isLeTextoReceipt(JSONObject json) {
        return StringUtils.isNotBlank(leTextoRawStatus(json));
    }

    private String leTextoRawStatus(JSONObject json) {
        // "statuts" est l'orthographe de la documentation LeTexto ; on tolère les variantes.
        for (String key : new String[] { "statuts", "status", "statut" }) {
            String value = json.optString(key, null);
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }

    /**
     * Applique un DLR LeTexto : le destinataire est retrouvé par customData (id du NotificationClient passé à l'envoi)
     * en priorité, sinon par l'identifiant de message stocké dans resource_url.
     */
    private boolean handleLeTextoReceipt(JSONObject json) {
        String rawStatus = leTextoRawStatus(json);
        String messageId = json.optString("id", null);
        String customData = json.optString("customData", null);
        NotificationClient target = null;
        if (StringUtils.isNotBlank(customData)) {
            target = em.find(NotificationClient.class, customData.trim());
        }
        if (target == null && StringUtils.isNotBlank(messageId)) {
            target = findClientForDeliveryReceipt(messageId, null);
        }
        if (target == null) {
            LOG.log(Level.WARNING, "DLR LeTexto sans destinataire correspondant (id={0}, customData={1})",
                    new Object[] { messageId, customData });
            return false;
        }
        String normalized = SmsDeliveryStatus.fromLeTexto(rawStatus);
        target.setDeliveryStatus(normalized);
        if (SmsDeliveryStatus.DELIVERY_IMPOSSIBLE.equals(normalized)) {
            target.setErrorMessage("Livraison impossible (DLR LeTexto)");
        }
        em.merge(target);
        LOG.log(Level.INFO, "DLR LeTexto applique : client={0}, id={1}, status={2}",
                new Object[] { target.getId(), messageId, normalized });
        return true;
    }

    @Override
    public JSONObject refreshDeliveryStatuses() {
        try {
            SmsProvider provider = smsProviderFactory.current();
            if (provider == null || !provider.supportsMessageStatus()) {
                return new JSONObject().put("success", true).put("checked", 0).put("updated", 0);
            }
            List<NotificationClient> pendings = em.createQuery(
                    "SELECT o FROM NotificationClient o WHERE o.fournisseurCode = :code AND o.resourceUrl IS NOT NULL"
                            + " AND o.sentAt >= :minSentAt AND o.pollCount < :maxPolls"
                            + " AND (o.deliveryStatus IS NULL OR o.deliveryStatus NOT IN (:finalStatuses))"
                            + " ORDER BY o.sentAt DESC",
                    NotificationClient.class).setParameter("code", provider.getCode())
                    .setParameter("minSentAt", LocalDateTime.now().minusDays(3)).setParameter("maxPolls", 10)
                    .setParameter("finalStatuses",
                            List.of(SmsDeliveryStatus.DELIVERED_TO_TERMINAL, SmsDeliveryStatus.DELIVERY_IMPOSSIBLE))
                    .setMaxResults(50).getResultList();
            int updated = 0;
            for (NotificationClient toClient : pendings) {
                util.sms.SmsStatusResult statusResult = provider.messageStatus(toClient.getResourceUrl());
                toClient.setPollCount(toClient.getPollCount() + 1);
                toClient.setLastPollAt(LocalDateTime.now());
                if (statusResult.isFound() && StringUtils.isNotBlank(statusResult.getDeliveryStatus())
                        && !statusResult.getDeliveryStatus().equals(toClient.getDeliveryStatus())) {
                    toClient.setDeliveryStatus(statusResult.getDeliveryStatus());
                    if (SmsDeliveryStatus.DELIVERY_IMPOSSIBLE.equals(statusResult.getDeliveryStatus())) {
                        toClient.setErrorMessage("Livraison impossible (statut " + statusResult.getRawStatus() + " "
                                + provider.getCode() + ")");
                    }
                    updated++;
                }
                em.merge(toClient);
            }
            if (!pendings.isEmpty()) {
                LOG.log(Level.INFO, "Rafraichissement statuts SMS ({0}) : {1} interroges, {2} mis a jour",
                        new Object[] { provider.getCode(), pendings.size(), updated });
            }
            return new JSONObject().put("success", true).put("checked", pendings.size()).put("updated", updated);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec du rafraichissement des statuts SMS", e);
            return new JSONObject().put("success", false).put("msg", "Echec du rafraichissement des statuts.");
        }
    }

    /** Extrait l'objet deliveryInfo des différents formats de DR Orange. */
    private JSONObject extractDeliveryInfo(JSONObject json) {
        JSONObject container = json.optJSONObject("deliveryInfoNotification");
        if (container == null) {
            container = json;
        }
        Object di = container.opt("deliveryInfo");
        if (di instanceof JSONObject) {
            return (JSONObject) di;
        }
        if (di instanceof JSONArray && ((JSONArray) di).length() > 0) {
            return ((JSONArray) di).optJSONObject(0);
        }
        JSONObject list = container.optJSONObject("deliveryInfoList");
        if (list != null) {
            Object dis = list.opt("deliveryInfo");
            if (dis instanceof JSONObject) {
                return (JSONObject) dis;
            }
            if (dis instanceof JSONArray && ((JSONArray) dis).length() > 0) {
                return ((JSONArray) dis).optJSONObject(0);
            }
        }
        return null;
    }

    /** Retrouve le destinataire concerné par un DR : par resourceURL sinon par numéro. */
    private NotificationClient findClientForDeliveryReceipt(String resourceUrl, String address) {
        if (StringUtils.isNotBlank(resourceUrl)) {
            try {
                List<NotificationClient> byUrl = em
                        .createNamedQuery("NotificationClient.findByResourceUrl", NotificationClient.class)
                        .setParameter("resourceUrl", resourceUrl).setMaxResults(1).getResultList();
                if (!byUrl.isEmpty()) {
                    return byUrl.get(0);
                }
            } catch (Exception ignore) {
                // on tente le repli par numéro
            }
        }
        if (StringUtils.isNotBlank(address)) {
            try {
                String number = normalizeMsisdn(address);
                List<NotificationClient> byAddr = em.createQuery(
                        "SELECT o FROM NotificationClient o WHERE o.client.strADRESSE = :num ORDER BY o.sentAt DESC",
                        NotificationClient.class).setParameter("num", number).setMaxResults(1).getResultList();
                if (!byAddr.isEmpty()) {
                    return byAddr.get(0);
                }
            } catch (Exception ignore) {
                // aucun destinataire trouvé
            }
        }
        return null;
    }

    /** "tel:+2250709133208" -> "0709133208" (format stocké côté client). */
    private String normalizeMsisdn(String address) {
        String a = address.trim();
        if (a.startsWith("tel:")) {
            a = a.substring(4);
        }
        if (a.startsWith("+225")) {
            a = a.substring(4);
        } else if (a.startsWith("225")) {
            a = a.substring(3);
        }
        return a;
    }

    @Override
    public void sendSMS(String message) {
        if (StringUtils.isEmpty(sp.mobile)) {
            return;
        }
        try {
            SmsProvider provider = smsProviderFactory.current();
            if (provider == null) {
                LOG.log(Level.WARNING, "Envoi SMS ignore : aucun fournisseur SMS en vigueur pris en charge");
                return;
            }
            SmsSendResult result = provider.send(sp.mobile, message, null);
            LOG.log(Level.INFO, "sendSMS admin >>> numero={0}, fournisseur={1}, {2}",
                    new Object[] { sp.mobile, provider.getCode(), result.toLog() });
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }
}
