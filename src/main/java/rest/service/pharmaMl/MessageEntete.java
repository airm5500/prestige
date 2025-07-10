package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class MessageEntete {

    @XmlElement(name = "EMETTEUR", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private OfficinePartenaire emetteur;

    @XmlElement(name = "DESTINATAIRE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private OfficinePartenaire destinataire;

    @XmlElement(name = "DATE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private String date;

    public OfficinePartenaire getEmetteur() {
        return emetteur;
    }

    public void setEmetteur(OfficinePartenaire emetteur) {
        this.emetteur = emetteur;
    }

    public OfficinePartenaire getDestinataire() {
        return destinataire;
    }

    public void setDestinataire(OfficinePartenaire destinataire) {
        this.destinataire = destinataire;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

}
