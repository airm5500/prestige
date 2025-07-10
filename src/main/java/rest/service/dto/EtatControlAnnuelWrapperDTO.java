package rest.service.dto;

import java.util.List;
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
public class EtatControlAnnuelWrapperDTO {

    private List<EtatControlAnnuelDTO> etatControlAnnuels;
    private EtatControlAnnuelSummary summary;

    @NoArgsConstructor(force = true)
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class EtatControlAnnuelSummary {

        private final long totaltHtaxe;
        private final long totalTaxe;
        private final long totalTtc;
        private final long totalVenteTtc;
        private final long totalMarge;
        private final int totalNbreBon;
    }

}
