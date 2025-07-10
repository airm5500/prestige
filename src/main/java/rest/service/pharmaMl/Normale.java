
package rest.service.pharmaMl;

import java.util.List;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class Normale {

    @XmlElement(name = "LIGNE_N", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private List<LigneN> lignes;

    public List<LigneN> getLignes() {
        return lignes;
    }

    public void setLignes(List<LigneN> lignes) {
        this.lignes = lignes;
    }

}
