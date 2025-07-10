package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class PrixN {
    @XmlAttribute(name = "Nature")
    private String nature;

    @XmlAttribute(name = "Valeur")
    private String valeur;

    // Getters et Setters
    public String getNature() {
        return nature;
    }

    public void setNature(String nature) {
        this.nature = nature;
    }

    public String getValeur() {
        return valeur;
    }

    public void setValeur(String valeur) {
        this.valeur = valeur;
    }
}