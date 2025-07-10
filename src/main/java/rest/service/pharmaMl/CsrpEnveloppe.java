package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author koben
 */
@XmlRootElement(name = "CSRP_ENVELOPPE", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
@XmlAccessorType(XmlAccessType.FIELD)
public class CsrpEnveloppe {

    @XmlAttribute(name = "Nature_Action")
    private String natureAction;

    @XmlAttribute(name = "Version_Protocole")
    private String versionProtocole;

    @XmlAttribute(name = "Id_Logiciel")
    private String idLogiciel;

    @XmlAttribute(name = "Version_Logiciel")
    private String versionLogiciel;

    @XmlAttribute(name = "Usage")
    private String usage;

    @XmlElement(name = "ENTETE", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
    private Entete entete;

    @XmlElement(name = "CORPS", namespace = "urn:x-csrp:fr.csrp.protocole:enveloppe")
    private Corps corps;

    public String getNatureAction() {
        return natureAction;
    }

    public void setNatureAction(String natureAction) {
        this.natureAction = natureAction;
    }

    public String getVersionProtocole() {
        return versionProtocole;
    }

    public void setVersionProtocole(String versionProtocole) {
        this.versionProtocole = versionProtocole;
    }

    public String getIdLogiciel() {
        return idLogiciel;
    }

    public void setIdLogiciel(String idLogiciel) {
        this.idLogiciel = idLogiciel;
    }

    public String getVersionLogiciel() {
        return versionLogiciel;
    }

    public void setVersionLogiciel(String versionLogiciel) {
        this.versionLogiciel = versionLogiciel;
    }

    public String getUsage() {
        return usage;
    }

    public void setUsage(String usage) {
        this.usage = usage;
    }

    public Entete getEntete() {
        return entete;
    }

    public void setEntete(Entete entete) {
        this.entete = entete;
    }

    public Corps getCorps() {
        return corps;
    }

    public void setCorps(Corps corps) {
        this.corps = corps;
    }

}
