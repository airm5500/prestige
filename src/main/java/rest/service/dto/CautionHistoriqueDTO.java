package rest.service.dto;

/**
 *
 * @author koben
 */
public class CautionHistoriqueDTO {

    private String id;
    private int montant;
    private String mvtDate;
    private String user;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getMontant() {
        return montant;
    }

    public void setMontant(int montant) {
        this.montant = montant;
    }

    public String getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(String mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

}
