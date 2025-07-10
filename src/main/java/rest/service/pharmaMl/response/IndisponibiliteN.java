package rest.service.pharmaMl.response;

import javax.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class IndisponibiliteN {

    @XmlAttribute(name = "Code_Reponse")
    private String codeReponse;

    @XmlAttribute(name = "Additif")
    private String additif;

    @XmlElement(name = "PRODUIT_REMPLACANT", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private ProduitRemplacant produitRemplacant;

    // Getters et Setters
    public String getCodeReponse() {
        return codeReponse;
    }

    public void setCodeReponse(String codeReponse) {
        this.codeReponse = codeReponse;
    }

    public String getAdditif() {
        return additif;
    }

    public void setAdditif(String additif) {
        this.additif = additif;
    }

    public ProduitRemplacant getProduitRemplacant() {
        return produitRemplacant;
    }

    public void setProduitRemplacant(ProduitRemplacant produitRemplacant) {
        this.produitRemplacant = produitRemplacant;
    }
}