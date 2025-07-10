
package rest.service.dto;

/**
 *
 * @author koben
 */
public class ModePaymentAmount {
    private String modeCode;
    private String modeLibelle;
    private String montant;

    public String getModeCode() {
        return modeCode;
    }

    public void setModeCode(String modeCode) {
        this.modeCode = modeCode;
    }

    public String getModeLibelle() {
        return modeLibelle;
    }

    public void setModeLibelle(String modeLibelle) {
        this.modeLibelle = modeLibelle;
    }

    public String getMontant() {
        return montant;
    }

    public void setMontant(String montant) {
        this.montant = montant;
    }

    public ModePaymentAmount(String modeLibelle, String montant) {
        this.modeLibelle = modeLibelle;
        this.montant = montant;
    }

    public ModePaymentAmount() {
    }

}
