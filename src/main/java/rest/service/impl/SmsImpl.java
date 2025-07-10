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
import java.util.logging.Level;
import java.util.logging.Logger;
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
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SmsService;
import util.Constant;
import util.DateConverter;
import util.AppParameters;

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
            Client client = ClientBuilder.newClient();
            var message = notification.getMessage();

            JSONObject jSONObject = new JSONObject();
            JSONObject outboundSMSMessageRequest = new JSONObject();

            outboundSMSMessageRequest.put("senderAddress", sp.senderAddress);
            JSONObject outboundSMSTextMessage = new JSONObject();
            outboundSMSTextMessage.put("message", message);
            outboundSMSMessageRequest.put("outboundSMSTextMessage", outboundSMSTextMessage);
            jSONObject.put("outboundSMSMessageRequest", outboundSMSMessageRequest);
            WebTarget myResource = client.target(sp.pathsmsapisendmessageurl);
            var bearer = "Bearer ".concat(smsToken.getAccessToken());
            Collection<NotificationClient> toClients = notification.getNotificationClients();
            int count = 0;
            for (NotificationClient toClient : toClients) {
                TClient tc = toClient.getClient();
                if (StringUtils.isNotEmpty(tc.getStrADRESSE())) {
                    outboundSMSMessageRequest.put("address", "tel:+225" + tc.getStrADRESSE());
                    Response response = myResource.request().header("Authorization", bearer)
                            .post(Entity.entity(jSONObject.toString(), MediaType.APPLICATION_JSON_TYPE));
                    if (response.getStatus() == 201) {
                        toClient.setStatut(Statut.SENT);
                        toClient.setSentAt(LocalDateTime.now());
                        count++;

                    }
                }

            }
            notification.setNumberAttempt(notification.getNumberAttempt() + 1);
            notification.setModfiedAt(LocalDateTime.now());

            LOG.log(Level.INFO, "nombre de message envoye======{0}", count);
            em.merge(notification);

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

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
