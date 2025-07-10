/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.util.Objects;

/**
 *
 * @author koben
 */
public class MessagePayloadDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String from, message, message_id, sent_to, secret, device_id, sent_timestamp;

    public MessagePayloadDTO(String from, String message, String message_id, String sent_to, String secret,
            String device_id, String sent_timestamp) {
        this.from = from;
        this.message = message;
        this.message_id = message_id;
        this.sent_to = sent_to;
        this.secret = secret;
        this.device_id = device_id;
        this.sent_timestamp = sent_timestamp;
    }

    public MessagePayloadDTO() {
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getMessage_id() {
        return message_id;
    }

    public void setMessage_id(String message_id) {
        this.message_id = message_id;
    }

    public String getSent_to() {
        return sent_to;
    }

    public void setSent_to(String sent_to) {
        this.sent_to = sent_to;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getDevice_id() {
        return device_id;
    }

    public void setDevice_id(String device_id) {
        this.device_id = device_id;
    }

    public String getSent_timestamp() {
        return sent_timestamp;
    }

    public void setSent_timestamp(String sent_timestamp) {
        this.sent_timestamp = sent_timestamp;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 83 * hash + Objects.hashCode(this.message_id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final MessagePayloadDTO other = (MessagePayloadDTO) obj;
        if (!Objects.equals(this.message_id, other.message_id)) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "MessagePayloadDTO{" + "from=" + from + ", message=" + message + ", message_id=" + message_id
                + ", sent_to=" + sent_to + ", secret=" + secret + ", device_id=" + device_id + ", sent_timestamp="
                + sent_timestamp + '}';
    }

}
