package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class CorpsRepartiteur {
    @XmlElement(name = "REP_COMMANDE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private RepCommande repCommande;

    // Getters et Setters
    public RepCommande getRepCommande() {
        return repCommande;
    }

    public void setRepCommande(RepCommande repCommande) {
        this.repCommande = repCommande;
    }
}