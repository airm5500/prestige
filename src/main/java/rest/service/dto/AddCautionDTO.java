package rest.service.dto;

/**
 *
 * @author koben
 */
public class AddCautionDTO {

    private String idCaution;
    private String tiersPayantId;
    private int montant;

    public String getIdCaution() {
        return idCaution;
    }

    public void setIdCaution(String idCaution) {
        this.idCaution = idCaution;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public int getMontant() {
        return montant;
    }

    public void setMontant(int montant) {
        this.montant = montant;
    }

}
