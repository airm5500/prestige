package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@NoArgsConstructor(force = true)
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class EtatControlAnnuelDTO {

    private final String groupByLibelle;
    private final long montantHtaxe;
    private final long montantTaxe;
    private final long montantTtc;
    private final long montantVenteTtc;
    private final long montantMarge;
    private final int nbreBon;
    private float pourcentage;
}
