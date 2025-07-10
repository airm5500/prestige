package commonTasks.dto;

import javax.validation.constraints.NotNull;
import java.util.Objects;

public class VenteReglementDTO {

    private @NotNull String typeReglement;
    private int montant;
    private int montantAttentu;
    private String typeReglementId;
    private int montantnetug;
    private int montantTttcug;
    private int amountNonCa;
    private int montantAnnulation;

    public String getTypeReglement() {
        return typeReglement;
    }

    public int getMontantAnnulation() {
        return montantAnnulation;
    }

    public void setMontantAnnulation(int montantAnnulation) {
        this.montantAnnulation = montantAnnulation;
    }

    public VenteReglementDTO setTypeReglement(String typeReglement) {
        this.typeReglement = typeReglement;
        return this;
    }

    public int getMontant() {
        return montant;
    }

    public VenteReglementDTO setMontant(int montant) {
        this.montant = montant;
        return this;
    }

    public String getTypeReglementId() {
        return typeReglementId;
    }

    public void setTypeReglementId(String typeReglementId) {
        this.typeReglementId = typeReglementId;
    }

    public int getMontantAttentu() {
        return Objects.nonNull(montantAttentu) ? montantAttentu : montant;

    }

    public void setMontantAttentu(int montantAttentu) {
        this.montantAttentu = montantAttentu;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        VenteReglementDTO that = (VenteReglementDTO) o;
        return Objects.equals(typeReglement, that.typeReglement);
    }

    public int getMontantnetug() {
        return montantnetug;
    }

    public void setMontantnetug(int montantnetug) {
        this.montantnetug = montantnetug;
    }

    public int getMontantTttcug() {
        return montantTttcug;
    }

    public void setMontantTttcug(int montantTttcug) {
        this.montantTttcug = montantTttcug;
    }

    public int getAmountNonCa() {
        return amountNonCa;
    }

    public void setAmountNonCa(int amountNonCa) {
        this.amountNonCa = amountNonCa;
    }

    @Override
    public int hashCode() {
        return Objects.hash(typeReglement);
    }
}
