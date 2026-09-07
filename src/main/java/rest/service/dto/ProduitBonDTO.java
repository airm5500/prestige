package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * Un produit d'un bon, tel que l'edition « liste des bons avec produits » l'imprime.
 *
 * L'edition etait auparavant construite en code ; elle est desormais un etat JasperReports, qui a besoin de recevoir
 * les produits sous forme de beans pour alimenter le tableau imbrique sous chaque bon.
 */
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ProduitBonDTO {

    private String cip;
    private String libelle;
    private int quantite;
    private int montant;
}
