package rest.service.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Un bloc du releve : UN groupe de tiers payants et toutes ses factures de groupe sur la periode.
 *
 * @author koben
 */
public class ReleveGroupeDTO {

    private Integer groupeId;
    private String groupeLibelle;
    private BigDecimal montantFacture = BigDecimal.ZERO;
    private BigDecimal montantRegle = BigDecimal.ZERO;
    private BigDecimal montantRestant = BigDecimal.ZERO;
    private List<ReleveGroupeLigneDTO> factures = new ArrayList<>();

    public ReleveGroupeDTO() {
    }

    public ReleveGroupeDTO(Integer groupeId, String groupeLibelle) {
        this.groupeId = groupeId;
        this.groupeLibelle = groupeLibelle;
    }

    public Integer getGroupeId() {
        return groupeId;
    }

    public void setGroupeId(Integer groupeId) {
        this.groupeId = groupeId;
    }

    public String getGroupeLibelle() {
        return groupeLibelle;
    }

    public void setGroupeLibelle(String groupeLibelle) {
        this.groupeLibelle = groupeLibelle;
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

    public List<ReleveGroupeLigneDTO> getFactures() {
        return factures;
    }

    public void setFactures(List<ReleveGroupeLigneDTO> factures) {
        this.factures = factures;
    }
}
