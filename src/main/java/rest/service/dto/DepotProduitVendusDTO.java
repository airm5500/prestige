
package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Setter
@Getter
@Builder
public class DepotProduitVendusDTO {

    private String codeCip, produitName, produitId, codeEan;
    private int prixUni, prixAchat;
    private long quantite;
    private long montantVente;
    private long montantAchat;
    private String tiersPayantName;
    private String tiersPayantId;

}
