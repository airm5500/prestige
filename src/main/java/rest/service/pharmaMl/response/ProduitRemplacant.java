package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class ProduitRemplacant {
    @XmlAttribute(name = "Type_Remplacement")
    private String typeRemplacement;

    @XmlAttribute(name = "Type_Codification")
    private String typeCodification;

    @XmlAttribute(name = "Code_Produit")
    private String codeProduit;

    @XmlAttribute(name = "Designation")
    private String designation;

    // Getters et Setters
    public String getTypeRemplacement() {
        return typeRemplacement;
    }

    public void setTypeRemplacement(String typeRemplacement) {
        this.typeRemplacement = typeRemplacement;
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

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }
}