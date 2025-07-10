package rest.service.dto;

import java.util.List;

/**
 *
 * @author koben
 */
public class CautionDTO {

    private String tiersPayantName;

    private String id;
    private int montant;
    private int conso;
    private String mvtDate;
    private String user;
    private List<CautionHistoriqueDTO> cautionHistoriques;
    private String updatedAt;

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getTiersPayantName() {
        return tiersPayantName;
    }

    public void setTiersPayantName(String tiersPayantName) {
        this.tiersPayantName = tiersPayantName;
    }

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

    public int getConso() {
        return conso;
    }

    public void setConso(int conso) {
        this.conso = conso;
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

    public List<CautionHistoriqueDTO> getCautionHistoriques() {
        return cautionHistoriques;
    }

    public void setCautionHistoriques(List<CautionHistoriqueDTO> cautionHistoriques) {
        this.cautionHistoriques = cautionHistoriques;
    }

}
