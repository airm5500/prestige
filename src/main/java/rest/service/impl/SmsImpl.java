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
import rest.service.SmsService;
import util.Constant;
import util.DateConverter;
import util.AppParameters;
import util.OrangeSmsClient;
import util.OrangeSmsResult;
import util.SmsDeliveryStatus;

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

    @Override
    public JSONObject findAccessToken() {
        try {
            Client client = ClientBuilder.newClient();

            MultivaluedMap<String, String> formdata = new MultivaluedHashMap<>();

            formdata.add("grant_type", DateConverter.GRANT_TYPE);
            WebTarget myResource = client.target(sp.pathsmsapitokenendpoint);
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

    private String getBasicHeader() {
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
                smsToken.setHeader("Basic ZkphT2xKZ3dVMmdnY1JXbUlsYlU5czdqWTh0YnNSeTg6U01FNTVndFlkdjJoNlkwUQ==");
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
            WebTarget myResource = client.target(sp.pathsmsapitokenendpoint);
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
        SmsToken smsToken = getOrupdateSmsToken();
        if (smsToken == null) {
            throw new RuntimeException("Impossible de charger l'acces token");
        }

        try {
            String message = notification.getMessage();
            String bearer = smsToken.getAccessToken();
            Collection<NotificationClient> toClients = notification.getNotificationClients();
            int sent = 0;
            int total = 0;
            for (NotificationClient toClient : toClients) {
                TClient tc = toClient.getClient();
                if (tc == null || StringUtils.isEmpty(tc.getStrADRESSE())) {
                    continue;
                }
                total++;
                String address = "tel:+225" + tc.getStrADRESSE();
                OrangeSmsResult result = OrangeSmsClient.send(sp.pathsmsapisendmessageurl, bearer, sp.senderAddress,
                        address, message);
                applyResultToClient(toClient, result);
                LOG.log(Level.INFO, "sendSMS >>> notification={0}, client={1}, address={2}, {3}",
                        new Object[] { notification.getId(), toClient.getId(), address, result.toLog() });
                if (result.isAccepted()) {
                    sent++;
                }
            }
            notification.setNumberAttempt(notification.getNumberAttempt() + 1);
            notification.setModfiedAt(LocalDateTime.now());
            updateNotificationStatut(notification, sent, total);

            LOG.log(Level.INFO, "SMS acceptes par Orange ====== {0}/{1} (notification {2})",
                    new Object[] { sent, total, notification.getId() });
            em.merge(notification);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, "Echec envoi SMS notification " + notification.getId(), ex);
        }

    }

    /** Reporte le résultat Orange sur le destinataire (statut, resourceURL, erreur). */
    private void applyResultToClient(NotificationClient toClient, OrangeSmsResult result) {
        toClient.setLastHttpStatus(result.getHttpStatus());
        if (result.isAccepted()) {
            toClient.setStatut(Statut.SENT);
            toClient.setSentAt(LocalDateTime.now());
            toClient.setResourceUrl(result.getResourceUrl());
            toClient.setDeliveryStatus(SmsDeliveryStatus.ACCEPTED_BY_ORANGE);
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
        SmsToken smsToken = getOrupdateSmsToken();
        if (smsToken != null) {
            try {
                Client client = ClientBuilder.newClient();
                JSONObject jSONObject = new JSONObject();
                JSONObject outboundSMSMessageRequest = new JSONObject();
                outboundSMSMessageRequest.put("senderAddress", sp.senderAddress);
                JSONObject outboundSMSTextMessage = new JSONObject();
                outboundSMSTextMessage.put("message", message);
                outboundSMSMessageRequest.put("outboundSMSTextMessage", outboundSMSTextMessage);
                jSONObject.put("outboundSMSMessageRequest", outboundSMSMessageRequest);
                WebTarget myResource = client.target(sp.pathsmsapisendmessageurl);
                var bearer = "Bearer ".concat(smsToken.getAccessToken());
                outboundSMSMessageRequest.put("address", "tel:+225" + sp.mobile);
                myResource.request().header("Authorization", bearer)
                        .post(Entity.entity(jSONObject.toString(), MediaType.APPLICATION_JSON_TYPE));
            } catch (Exception ex) {
                LOG.log(Level.SEVERE, null, ex);
            }
        }

    }
}
