
package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class Partenaire {

    @XmlAttribute(name = "Nature")
    private String nature;

    @XmlAttribute(name = "Code")
    private String code;

    @XmlAttribute(name = "Id")
    private String id;

    @XmlAttribute(name = "Adresse")
    private String adresse;

    public String getNature() {
        return nature;
    }

    public void setNature(String nature) {
        this.nature = nature;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAdresse() {
        return adresse;
    }

    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }

}
