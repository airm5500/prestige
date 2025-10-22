
package rest.service.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 *
 * @author airman
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyseInvDTO {

    private String codeCip;
    private String nom;
    private Double prixAchat;
    private Double prixVente;
    private String emplacement;
    private String inventaireId;
    private String invName;
    private Integer qteSaisie;
    private Integer qteInitiale;

}
