/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import org.apache.commons.lang3.StringUtils;
import util.AppParameters;

/**
 *
 * @author koben
 */
public class Sms implements Runnable {

    private static final Logger LOG = Logger.getLogger(Sms.class.getName());
    private String message;
    private String receiverAddres;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getReceiverAddres() {
        return receiverAddres;
    }

    public void setReceiverAddres(String receiverAddres) {
        this.receiverAddres = receiverAddres;
    }

    public void sendSMS() {
        // Passe par le pipeline SmsService (fournisseur SMS en vigueur configuré en base)
        // quand le conteneur est accessible ; sinon repli sur l'appel Orange historique.
        if (StringUtils.isEmpty(getReceiverAddres()) && sendViaSmsService()) {
            return;
        }
        try {
            Client client = ClientBuilder.newClient();
            AppParameters sp = AppParameters.getInstance();
            String address = getReceiverAddres();
            if (StringUtils.isEmpty(address)) {
                address = sp.mobile;
            }
            JSONObject jSONObject = new JSONObject();
            JSONObject outboundSMSMessageRequest = new JSONObject();
            outboundSMSMessageRequest.put("address", "tel:+225" + address);
            outboundSMSMessageRequest.put("senderAddress", sp.senderAddress);
            JSONObject outboundSMSTextMessage = new JSONObject();
            outboundSMSTextMessage.put("message", getMessage());
            outboundSMSMessageRequest.put("outboundSMSTextMessage", outboundSMSTextMessage);
            jSONObject.put("outboundSMSMessageRequest", outboundSMSMessageRequest);
            WebTarget myResource = client.target(sp.pathsmsapisendmessageurl);
            Response response = myResource.request().header("Authorization", "Bearer ".concat(sp.accesstoken))
                    .post(Entity.entity(jSONObject.toString(), MediaType.APPLICATION_JSON_TYPE));
            LOG.log(Level.INFO, "response ---  {0}", response.readEntity(String.class));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    private boolean sendViaSmsService() {
        // java:module n'est pas résolvable depuis un thread non géré : on tente aussi java:global.
        for (String jndiName : new String[] { "java:module/SmsImpl!rest.service.SmsService",
                "java:global/prestige/SmsImpl!rest.service.SmsService" }) {
            try {
                rest.service.SmsService smsService = (rest.service.SmsService) new javax.naming.InitialContext()
                        .lookup(jndiName);
                smsService.sendSMS(getMessage());
                return true;
            } catch (Exception e) {
                LOG.log(Level.FINE, "Lookup SmsService impossible via " + jndiName, e);
            }
        }
        LOG.log(Level.WARNING, "SmsService inaccessible, envoi via l'appel Orange historique");
        return false;
    }

    @Override
    public void run() {
        sendSMS();
    }

}
