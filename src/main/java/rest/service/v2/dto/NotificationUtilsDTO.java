package rest.service.v2.dto;

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class NotificationUtilsDTO {

    private String user;
    private String dateMvt;

    private String montant;
    private String type;
    private String message;
    private String numBon;
    private String montantTva;
    private String montantTtc;

    private String dateBon;
    private List<NotificationUtilsDTO> detail = new ArrayList<>();
    private String description;
    private String quantite;
    private String quantiteInit;
    private String quantiteFinale;

    private String prixUni;
    private String prixFinal;
    private String prixAchatUni;
    private String prixAchatFinal;

    private String dateMvtIni;
    private String code;

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getDateMvt() {
        return dateMvt;
    }

    public void setDateMvt(String dateMvt) {
        this.dateMvt = dateMvt;
    }

    public String getMontant() {
        return montant;
    }

    public void setMontant(String montant) {
        this.montant = montant;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getNumBon() {
        return numBon;
    }

    public void setNumBon(String numBon) {
        this.numBon = numBon;
    }

    public String getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(String montantTva) {
        this.montantTva = montantTva;
    }

    public String getMontantTtc() {
        return montantTtc;
    }

    public void setMontantTtc(String montantTtc) {
        this.montantTtc = montantTtc;
    }

    public String getDateBon() {
        return dateBon;
    }

    public void setDateBon(String dateBon) {
        this.dateBon = dateBon;
    }

    public List<NotificationUtilsDTO> getDetail() {
        return detail;
    }

    public void setDetail(List<NotificationUtilsDTO> detail) {
        this.detail = detail;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getQuantite() {
        return quantite;
    }

    public void setQuantite(String quantite) {
        this.quantite = quantite;
    }

    public String getQuantiteInit() {
        return quantiteInit;
    }

    public void setQuantiteInit(String quantiteInit) {
        this.quantiteInit = quantiteInit;
    }

    public String getQuantiteFinale() {
        return quantiteFinale;
    }

    public void setQuantiteFinale(String quantiteFinale) {
        this.quantiteFinale = quantiteFinale;
    }

    public String getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(String prixUni) {
        this.prixUni = prixUni;
    }

    public String getPrixFinal() {
        return prixFinal;
    }

    public void setPrixFinal(String prixFinal) {
        this.prixFinal = prixFinal;
    }

    public String getPrixAchatUni() {
        return prixAchatUni;
    }

    public void setPrixAchatUni(String prixAchatUni) {
        this.prixAchatUni = prixAchatUni;
    }

    public String getPrixAchatFinal() {
        return prixAchatFinal;
    }

    public void setPrixAchatFinal(String prixAchatFinal) {
        this.prixAchatFinal = prixAchatFinal;
    }

    public String getDateMvtIni() {
        return dateMvtIni;
    }

    public void setDateMvtIni(String dateMvtIni) {
        this.dateMvtIni = dateMvtIni;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    @Override
    public String toString() {
        return "NotificationUtilsDTO{" + "user=" + user + ", dateMvt=" + dateMvt + ", montant=" + montant + ", type="
                + type + ", message=" + message + ", numBon=" + numBon + ", montantTva=" + montantTva + ", montantTtc="
                + montantTtc + ", dateBon=" + dateBon + ", detail=" + detail + ", description=" + description
                + ", quantite=" + quantite + ", quantiteInit=" + quantiteInit + ", quantiteFinale=" + quantiteFinale
                + ", prixUni=" + prixUni + ", prixFinal=" + prixFinal + ", prixAchatUni=" + prixAchatUni
                + ", prixAchatFinal=" + prixAchatFinal + ", dateMvtIni=" + dateMvtIni + ", code=" + code + '}';
    }

}
