package commonTasks.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class ReportFactureDTO {

    private List<FactureDTO> factures = new ArrayList<>();
    private String tiersPayantId;
    private String tiersPayantLibelle;
    private BigDecimal montantFacture;
    private BigDecimal montantRegle;
    private BigDecimal montantRestant;
    private String typeTiersPayantId;
    private String typeTiersPayantLibelle;

    public List<FactureDTO> getFactures() {
        return factures;
    }

    public ReportFactureDTO(String tiersPayantId, String tiersPayantLibelle, String typeTiersPayantId,
            String typeTiersPayantLibelle) {
        this.tiersPayantId = tiersPayantId;
        this.tiersPayantLibelle = tiersPayantLibelle;
        this.typeTiersPayantId = typeTiersPayantId;
        this.typeTiersPayantLibelle = typeTiersPayantLibelle;
    }

    public ReportFactureDTO(String tiersPayantId, String tiersPayantLibelle) {
        this.tiersPayantId = tiersPayantId;
        this.tiersPayantLibelle = tiersPayantLibelle;
    }

    public void setFactures(List<FactureDTO> factures) {
        this.factures = factures;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayantLibelle() {
        return tiersPayantLibelle;
    }

    public void setTiersPayantLibelle(String tiersPayantLibelle) {
        this.tiersPayantLibelle = tiersPayantLibelle;
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

    public ReportFactureDTO() {
    }

    public void setMontantRestant(BigDecimal montantRestant) {
        this.montantRestant = montantRestant;
    }

    public String getTypeTiersPayantId() {
        return typeTiersPayantId;
    }

    public void setTypeTiersPayantId(String typeTiersPayantId) {
        this.typeTiersPayantId = typeTiersPayantId;
    }

    public String getTypeTiersPayantLibelle() {
        return typeTiersPayantLibelle;
    }

    public void setTypeTiersPayantLibelle(String typeTiersPayantLibelle) {
        this.typeTiersPayantLibelle = typeTiersPayantLibelle;
    }

}
