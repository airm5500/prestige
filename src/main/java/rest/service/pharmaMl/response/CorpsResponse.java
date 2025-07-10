package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class CorpsResponse {
    @XmlElement(name = "MESSAGE_REPARTITEUR", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private MessageRepartiteur messageRepartiteur;

    // Getters et Setters
    public MessageRepartiteur getMessageRepartiteur() {
        return messageRepartiteur;
    }

    public void setMessageRepartiteur(MessageRepartiteur messageRepartiteur) {
        this.messageRepartiteur = messageRepartiteur;
    }
}