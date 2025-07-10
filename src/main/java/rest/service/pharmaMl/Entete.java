
package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class Entete {

    @XmlElement(name = "EMETTEUR", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
    private Partenaire emetteur;

    @XmlElement(name = "RECEPTEUR", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
    private Partenaire recepteur;

    @XmlElement(name = "REF_MESSAGE", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
    private String refMessage;

    @XmlElement(name = "DATE", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
    private String date;

    public Partenaire getEmetteur() {
        return emetteur;
    }

    public void setEmetteur(Partenaire emetteur) {
        this.emetteur = emetteur;
    }

    public Partenaire getRecepteur() {
        return recepteur;
    }

    public void setRecepteur(Partenaire recepteur) {
        this.recepteur = recepteur;
    }

    public String getRefMessage() {
        return refMessage;
    }

    public void setRefMessage(String refMessage) {
        this.refMessage = refMessage;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

}
