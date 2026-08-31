package rest.service.dto;

/**
 * Une ligne retenue du compte rendu d'import de la reponse grossiste, telle que l'ecran la renvoie pour application.
 *
 * <p>
 * Volontairement reduite a l'identifiant de la ligne de commande et a la quantite servie : le serveur ne fait confiance
 * a rien d'autre venant de l'ecran, il relit la ligne en base et verifie qu'elle appartient bien a la commande visee.
 */
public class ReponseGrossisteLigneDTO {

    private String detailId;
    private Integer qteRecue;

    public String getDetailId() {
        return detailId;
    }

    public void setDetailId(String detailId) {
        this.detailId = detailId;
    }

    public Integer getQteRecue() {
        return qteRecue;
    }

    public void setQteRecue(Integer qteRecue) {
        this.qteRecue = qteRecue;
    }
}
