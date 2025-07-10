package rest.service.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class BonsTotauxDTO {

    private BigDecimal montant;
    private BigDecimal montantRemise;
    private BigDecimal montantNet;
    private int nbreBon;
}
