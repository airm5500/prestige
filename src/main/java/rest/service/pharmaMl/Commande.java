
package rest.service.pharmaMl;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author koben
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class Commande {

    @XmlAttribute(name = "Ref_Cde_Client")
    private String refCdeClient;

    @XmlAttribute(name = "Commentaire_General")
    private String commentaireGeneral;

    @XmlAttribute(name = "Date_livraison")
    private String dateLivraison;

    @XmlElement(name = "NORMALE", namespace = "urn:x-csrp:fr.csrp.protocole:message")
    private Normale normale;

    public String getRefCdeClient() {
        return refCdeClient;
    }

    public void setRefCdeClient(String refCdeClient) {
        this.refCdeClient = refCdeClient;
    }

    public String getCommentaireGeneral() {
        return commentaireGeneral;
    }

    public void setCommentaireGeneral(String commentaireGeneral) {
        this.commentaireGeneral = commentaireGeneral;
    }

    public String getDateLivraison() {
        return dateLivraison;
    }

    public void setDateLivraison(String dateLivraison) {
        this.dateLivraison = dateLivraison;
    }

    public Normale getNormale() {
        return normale;
    }

    public void setNormale(Normale normale) {
        this.normale = normale;
    }

}
