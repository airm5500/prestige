package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class MessageOfficine {

    @XmlElement(name = "ENTETE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private MessageEntete entete;

    @XmlElement(name = "CORPS", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private MessageCorps corps;

    public MessageEntete getEntete() {
        return entete;
    }

    public void setEntete(MessageEntete entete) {
        this.entete = entete;
    }

    public MessageCorps getCorps() {
        return corps;
    }

    public void setCorps(MessageCorps corps) {
        this.corps = corps;
    }

}
