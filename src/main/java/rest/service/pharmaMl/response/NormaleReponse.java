package rest.service.pharmaMl.response;

import java.util.List;
import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class NormaleReponse {

    @XmlElement(name = "LIGNE_N", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private List<LigneNReponse> lignes;

    // Getters et Setters
    public List<LigneNReponse> getLignes() {
        return lignes;
    }

    public void setLignes(List<LigneNReponse> lignes) {
        this.lignes = lignes;
    }
}