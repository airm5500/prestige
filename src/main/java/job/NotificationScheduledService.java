package job;

import dal.Notification;
import dal.NotificationClient;
import dal.SmsToken;
import dal.TParameters;
import dal.enumeration.Canal;
import dal.enumeration.Statut;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedHashMap;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.NotificationService;
import util.AppParameters;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class NotificationScheduledService {

    private static final Logger LOG = Logger.getLogger(NotificationScheduledService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Inject
    private NotificationService notificationService;

    @Asynchronous
    public void sendPendingEmailsAsync() {
        notificationService.sendMail();
    }

    @Asynchronous
    public void sendPendingSmsAsync() {
        if (checkParameterByKey(Constant.KEY_SMS_CLOTURE_CAISSE)) {
            List<Notification> notifications = findAllByCanal();
            for (Notification notification : notifications) {
                try {
                    sendSMS(notification);
                } catch (Exception e) {
                    LOG.log(Level.SEVERE, "", e);
                }

            }

        }

    }

    private void sendSMS(Notification notification) {
        Client client = ClientBuilder.newClient();
        AppParameters sp = AppParameters.getInstance();
        List<NotificationClient> toClients = findNotificationClients(notification);
        String address = null;
        if (!toClients.isEmpty()) { // a revoir pour les envois multiples
            address = toClients.get(0).getClient().getStrADRESSE();
        }
        if (StringUtils.isEmpty(address)) {
            address = sp.mobile;
        }
        JSONObject jSONObject = new JSONObject();
        JSONObject outboundSMSMessageRequest = new JSONObject();
        outboundSMSMessageRequest.put("address", "tel:+225" + address);
        outboundSMSMessageRequest.put("senderAddress", sp.senderAddress);
        JSONObject outboundSMSTextMessage = new JSONObject();
        outboundSMSTextMessage.put("message", notification.getMessage());
        outboundSMSMessageRequest.put("outboundSMSTextMessage", outboundSMSTextMessage);
        jSONObject.put("outboundSMSMessageRequest", outboundSMSMessageRequest);
        WebTarget myResource = client.target(sp.pathsmsapisendmessageurl);
        Response response = myResource.request().header("Authorization", "Bearer ".concat(getAccessToken()))
                .post(Entity.entity(jSONObject.toString(), MediaType.APPLICATION_JSON_TYPE));
        LOG.log(Level.INFO, "sendSMS >>> {0} {1} {2}",
                new Object[] { response.getStatus(), response.readEntity(String.class), address });
        if (response.getStatus() == 201) {
            notification.setStatut(Statut.SENT);

        } else {
            notification.setNumberAttempt(notification.getNumberAttempt() + 1);
            if (notification.getNumberAttempt() >= 3) {
                notification.setModfiedAt(LocalDateTime.now());
                notification.setStatut(Statut.LOCK);
            }
        }

        LOG.log(Level.INFO, null, notification.getStatut());
        em.merge(notification);

    }

    private List<NotificationClient> findNotificationClients(Notification n) {
        try {
            TypedQuery<NotificationClient> q = em.createNamedQuery("NotificationClient.findByNotificationId",
                    NotificationClient.class);
            q.setParameter("notificationId", n.getId());
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private String getAccessToken() {

        SmsToken smsToken = getOrupdateSmsToken();

        return Objects.nonNull(smsToken) ? smsToken.getAccessToken() : null;

    }

    private SmsToken getOrupdateSmsToken() {
        SmsToken smsToken = getSmsToken();
        if (smsToken == null) {
            JSONObject json = findAccessToken();
            if (json.has("success") && json.getBoolean("success")) {
                smsToken = new SmsToken();
                smsToken.setId("sms");
                JSONObject data = json.getJSONObject("data");
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

    private SmsToken getSmsToken() {
        try {
            return em.find(SmsToken.class, "sms");

        } catch (Exception e) {
            return null;
        }
    }

    private JSONObject findAccessToken() {
        try {
            Client client = ClientBuilder.newClient();
            AppParameters sp = AppParameters.getInstance();
            MultivaluedMap<String, String> formdata = new MultivaluedHashMap<>();
            formdata.add("grant_type", Constant.GRANT_TYPE);
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

    private String getBasicHeader() {
        try {
            return em.find(SmsToken.class, "sms").getHeader();

        } catch (Exception e) {
            return "";
        }
    }

    private List<Notification> findAllByCanal() {
        try {
            TypedQuery<Notification> q = em.createNamedQuery("Notification.findAllByCreatedAtAndStatusAndCanal",
                    Notification.class);
            q.setParameter("createdAt", LocalDateTime.parse(LocalDate.now().minusDays(1).toString() + " " + "00:00",
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            q.setParameter("statut", Statut.NOT_SEND);
            q.setParameter("canal", Canal.SMS);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private boolean checkParameterByKey(String key) {
        try {
            TParameters parameters = em.find(TParameters.class, key);
            return (Integer.parseInt(parameters.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
            return false;
        }
    }

}
