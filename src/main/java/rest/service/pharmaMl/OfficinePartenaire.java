
package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class OfficinePartenaire {

    @XmlAttribute(name = "Id_Client")
    private String idClient;

    @XmlAttribute(name = "Nature_Partenaire")
    private String naturePartenaire;

    @XmlAttribute(name = "Code_Societe")
    private String codeSociete;

    @XmlAttribute(name = "Id_Societe")
    private String idSociete;

    public String getIdClient() {
        return idClient;
    }

    public void setIdClient(String idClient) {
        this.idClient = idClient;
    }

    public String getNaturePartenaire() {
        return naturePartenaire;
    }

    public void setNaturePartenaire(String naturePartenaire) {
        this.naturePartenaire = naturePartenaire;
    }

    public String getCodeSociete() {
        return codeSociete;
    }

    public void setCodeSociete(String codeSociete) {
        this.codeSociete = codeSociete;
    }

    public String getIdSociete() {
        return idSociete;
    }

    public void setIdSociete(String idSociete) {
        this.idSociete = idSociete;
    }

}
