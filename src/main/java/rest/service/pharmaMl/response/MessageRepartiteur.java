package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class MessageRepartiteur {
    @XmlElement(name = "CORPS", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private CorpsRepartiteur corps;

    // Getters et Setters
    public CorpsRepartiteur getCorps() {
        return corps;
    }

    public void setCorps(CorpsRepartiteur corps) {
        this.corps = corps;
    }
}