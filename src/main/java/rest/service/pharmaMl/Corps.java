
package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class Corps {
    @XmlElement(name = "MESSAGE_OFFICINE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private MessageOfficine messageOfficine;

    public MessageOfficine getMessageOfficine() {
        return messageOfficine;
    }

    public void setMessageOfficine(MessageOfficine messageOfficine) {
        this.messageOfficine = messageOfficine;
    }

}
