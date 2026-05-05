package commonTasks.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class ReportTypeTiersPayantFactureDTO {

    private List<ReportFactureDTO> tierspayants = new ArrayList<>();

    private BigDecimal montantFacture;
    private BigDecimal montantRegle;
    private BigDecimal montantRestant;

    public List<ReportFactureDTO> getTierspayants() {
        return tierspayants;
    }

    public void setTierspayants(List<ReportFactureDTO> tierspayants) {
        this.tierspayants = tierspayants;
    }

    public BigDecimal getMontantFacture() {
        return montantFacture;
    }

    public void setMontantFacture(BigDecimal montantFacture) {
        this.montantFacture = montantFacture;
    }

    public BigDecimal getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(BigDecimal montantRegle) {
        this.montantRegle = montantRegle;
    }

    public BigDecimal getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(BigDecimal montantRestant) {
        this.montantRestant = montantRestant;
    }

}
