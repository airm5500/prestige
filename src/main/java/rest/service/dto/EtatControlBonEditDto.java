package rest.service.dto;

/**
 *
 * @author koben
 */
public class EtatControlBonEditDto {

    private String bonId;
    private String dateLivraison;
    private String grossisteId;
    private String referenceBon;
    private int tva;
    private int montantHt;

    public String getBonId() {
        return bonId;
    }

    public void setBonId(String bonId) {
        this.bonId = bonId;
    }

    public String getDateLivraison() {
        return dateLivraison;
    }

    public void setDateLivraison(String dateLivraison) {
        this.dateLivraison = dateLivraison;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getReferenceBon() {
        return referenceBon;
    }

    public void setReferenceBon(String referenceBon) {
        this.referenceBon = referenceBon;
    }

    public int getTva() {
        return tva;
    }

    public void setTva(int tva) {
        this.tva = tva;
    }

    public int getMontantHt() {
        return montantHt;
    }

    public void setMontantHt(int montantHt) {
        this.montantHt = montantHt;
    }

}
