package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class RepCommande {
    @XmlElement(name = "NORMALE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private NormaleReponse normale;

    // Getters et Setters
    public NormaleReponse getNormale() {
        return normale;
    }

    public void setNormale(NormaleReponse normale) {
        this.normale = normale;
    }
}