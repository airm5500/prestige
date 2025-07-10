
package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class LigneN {

    @XmlAttribute(name = "Num_Ligne")
    private String numLigne;

    @XmlAttribute(name = "Type_Codification")
    private String typeCodification;

    @XmlAttribute(name = "Code_Produit")
    private String codeProduit;

    @XmlAttribute(name = "Quantite")
    private String quantite;

    @XmlAttribute(name = "Equivalent")
    private boolean equivalent;

    @XmlAttribute(name = "Partielle")
    private boolean partielle;

    @XmlAttribute(name = "Reliquat")
    private boolean reliquat;

    public String getNumLigne() {
        return numLigne;
    }

    public void setNumLigne(String numLigne) {
        this.numLigne = numLigne;
    }

    public String getTypeCodification() {
        return typeCodification;
    }

    public void setTypeCodification(String typeCodification) {
        this.typeCodification = typeCodification;
    }

    public String getCodeProduit() {
        return codeProduit;
    }

    public void setCodeProduit(String codeProduit) {
        this.codeProduit = codeProduit;
    }

    public String getQuantite() {
        return quantite;
    }

    public void setQuantite(String quantite) {
        this.quantite = quantite;
    }

    public boolean isEquivalent() {
        return equivalent;
    }

    public void setEquivalent(boolean equivalent) {
        this.equivalent = equivalent;
    }

    public boolean isPartielle() {
        return partielle;
    }

    public void setPartielle(boolean partielle) {
        this.partielle = partielle;
    }

    public boolean isReliquat() {
        return reliquat;
    }

    public void setReliquat(boolean reliquat) {
        this.reliquat = reliquat;
    }

}
