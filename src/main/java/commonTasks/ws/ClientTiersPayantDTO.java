/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package commonTasks.ws;

/**
 *
 * @author koben
 */
public class ClientTiersPayantDTO {

    private String tiersPayantName;
    private String tiersPayantFullName;
    private String num;
    private Long plafondConso;
    private Long plafondJournalier;
    private Integer priorite;
    private String statut;
    private Integer taux;
    private Boolean plafondAbsolu;

    public Boolean getPlafondAbsolu() {
        return plafondAbsolu;
    }

    public void setPlafondAbsolu(Boolean plafondAbsolu) {
        this.plafondAbsolu = plafondAbsolu;
    }

    public String getTiersPayantName() {
        return tiersPayantName;
    }

    public void setTiersPayantName(String tiersPayantName) {
        this.tiersPayantName = tiersPayantName;
    }

    public String getTiersPayantFullName() {
        return tiersPayantFullName;
    }

    public void setTiersPayantFullName(String tiersPayantFullName) {
        this.tiersPayantFullName = tiersPayantFullName;
    }

    public String getNum() {
        return num;
    }

    public void setNum(String num) {
        this.num = num;
    }

    public Long getPlafondConso() {
        return plafondConso;
    }

    public void setPlafondConso(Long plafondConso) {
        this.plafondConso = plafondConso;
    }

    public Long getPlafondJournalier() {
        return plafondJournalier;
    }

    public void setPlafondJournalier(Long plafondJournalier) {
        this.plafondJournalier = plafondJournalier;
    }

    public Integer getPriorite() {
        return priorite;
    }

    public void setPriorite(Integer priorite) {
        this.priorite = priorite;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Integer getTaux() {
        return taux;
    }

    public void setTaux(Integer taux) {
        this.taux = taux;
    }

}
