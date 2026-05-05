package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(of = { "userId" })
public class TicketZDTO {

    private long totalEsp;

    private long totalCredit;
    private long totalCheque;
    private long totalVirement;
    private long totalCB;
    private long differe;
    private String user;
    private String userId;
    private long totalEntreeEsp;

    private long totalEntreeCredit;
    private long totalEntreeCheque;
    private long totalEntreeVirement;
    private long totalEntreeCB;

    private long totalReglementEsp;

    private long totalReglementCredit;
    private long totalReglementCheque;
    private long totalReglementVirement;
    private long totalReglementCB;

    private long totalSortieEsp;

    private long totalSortieCredit;
    private long totalSortieCheque;
    private long totalSortieVirement;
    private long totalSortieCB;

    private long montantMtn;
    private long montantOrange;
    private long montantMoov;
    private long montantWave;
    private long montantDjamo;

    private long montantReglementMtn;
    private long montantReglementOrange;
    private long montantReglementMoov;
    private long montantReglementWave;
    private long montantReglementDjamo;

    private long montantSortieMtn;
    private long montantSortieOrange;
    private long montantSortieMoov;
    private long montantSortieWave;
    private long montantSortieDjamo;

    private long montantEntreeMtn;
    private long montantEntreeOrange;
    private long montantEntreeMoov;
    private long montantEntreeWave;
    private long montantEntreeDjamo;

}
