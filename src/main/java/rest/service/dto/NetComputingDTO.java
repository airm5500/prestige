package rest.service.dto;

/**
 *
 * @author koben
 */
public class NetComputingDTO {

    private int montantVente;
    private int montantRemise;
    private float taux;
    private int montantTiersPayant;
    private int plafondVente; // montant a prendre en compte dans le calcul s'il y a des plafond
    private String idCompteClientTiersPayant;
    private String message;
    private String plafondGlobalMessage;
    private int percentage;
    private long plafondGlobal;
    private String numBon;

    public void setMontantVente(int montantVente) {
        this.montantVente = montantVente;
    }

    public void setTaux(float taux) {
        this.taux = taux;
    }

    public int getPercentage() {
        return percentage;
    }

    public void setPercentage(int percentage) {
        this.percentage = percentage;
    }

    public String getNumBon() {
        return numBon;
    }

    public void setNumBon(String numBon) {
        this.numBon = numBon;
    }

    public void setMontantTiersPayant(int montantTiersPayant) {
        this.montantTiersPayant = montantTiersPayant;
    }

    public void setIdCompteClientTiersPayant(String idCompteClientTiersPayant) {
        this.idCompteClientTiersPayant = idCompteClientTiersPayant;
    }

    public int getMontantVente() {
        return montantVente;
    }

    public int getMontantRemise() {
        return montantRemise;
    }

    public float getTaux() {
        return taux;
    }

    public int getMontantTiersPayant() {
        return montantTiersPayant;
    }

    public String getIdCompteClientTiersPayant() {
        return idCompteClientTiersPayant;
    }

    public int getPlafondVente() {
        return plafondVente;
    }

    public void setPlafondVente(int plafondVente) {
        this.plafondVente = plafondVente;
    }

    public void setPlafondGlobal(long plafondGlobal) {
        this.plafondGlobal = plafondGlobal;
    }

    public void setMontantRemise(int montantRemise) {
        this.montantRemise = montantRemise;
    }

    public long getPlafondGlobal() {
        return plafondGlobal;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getPlafondGlobalMessage() {
        return plafondGlobalMessage;
    }

    public void setPlafondGlobalMessage(String plafondGlobalMessage) {
        this.plafondGlobalMessage = plafondGlobalMessage;
    }

    @Override
    public String toString() {
        return "NetComputingDTO{" + "montantVente=" + montantVente + ", montantRemise=" + montantRemise + ", taux="
                + taux + ", montantTiersPayant=" + montantTiersPayant + ", plafondVente=" + plafondVente
                + ", idCompteClientTiersPayant=" + idCompteClientTiersPayant + ", message=" + message
                + ", plafondGlobalMessage=" + plafondGlobalMessage + ", percentage=" + percentage + ", plafondGlobal="
                + plafondGlobal + ", numBon=" + numBon + '}';
    }

}
