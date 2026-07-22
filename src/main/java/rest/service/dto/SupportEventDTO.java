/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;

/**
 * Evenement applicatif transmis au Centre de Support (capture backend ou frontend).
 *
 * @author koben
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class SupportEventDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String type;
    private String niveau;
    private String module;
    private String messageCourt;
    private String urlOuEcran;
    private String stack;
    private String payloadJson;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getNiveau() {
        return niveau;
    }

    public void setNiveau(String niveau) {
        this.niveau = niveau;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getMessageCourt() {
        return messageCourt;
    }

    public void setMessageCourt(String messageCourt) {
        this.messageCourt = messageCourt;
    }

    public String getUrlOuEcran() {
        return urlOuEcran;
    }

    public void setUrlOuEcran(String urlOuEcran) {
        this.urlOuEcran = urlOuEcran;
    }

    public String getStack() {
        return stack;
    }

    public void setStack(String stack) {
        this.stack = stack;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

}
