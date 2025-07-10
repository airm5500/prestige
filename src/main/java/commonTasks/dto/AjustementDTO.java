/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TAjustement;
import dal.TAjustementDetail;
import dal.TUser;
import dal.MotifAjustement;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.List;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class AjustementDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private String lgUSERID, userFullName, details = " ", lgAJUSTEMENTID, description, commentaire;
    private String dtUPDATED, heure;
    private boolean beCancel = false;

    public String getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public boolean isBeCancel() {
        return beCancel;
    }

    public void setBeCancel(boolean beCancel) {
        this.beCancel = beCancel;
    }

    public String getLgAJUSTEMENTID() {
        return lgAJUSTEMENTID;
    }

    public void setLgAJUSTEMENTID(String lgAJUSTEMENTID) {
        this.lgAJUSTEMENTID = lgAJUSTEMENTID;
    }

    public AjustementDTO(TAjustement ajustement, List<TAjustementDetail> tpds, boolean becancel) {
        TUser tUser = ajustement.getLgUSERID();
        this.lgUSERID = tUser.getLgUSERID();
        this.userFullName = tUser.getStrFIRSTNAME() + " " + tUser.getStrLASTNAME();
        this.description = ajustement.getStrNAME();
        this.commentaire = ajustement.getStrCOMMENTAIRE();
        this.dtUPDATED = dateFormat.format(ajustement.getDtUPDATED());
        this.heure = heureFormat.format(ajustement.getDtUPDATED());
        this.lgAJUSTEMENTID = ajustement.getLgAJUSTEMENTID();

        tpds.forEach((tpd) -> {
            MotifAjustement motif = tpd.getTypeAjustement();
            String typeLibelle = "";
            if (motif != null) {
                typeLibelle = motif.getLibelle();
            }

            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP()
                    + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrNAME()
                    + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntNUMBER()
                    + ")</span><span style='display:inline-block;width: 15%;'>"
                    + DateConverter.amountFormat(tpd.getLgFAMILLEID().getIntPAF(), '.') + " F CFA "
                    + "</span><span style='display:inline-block;width: 15%;'>" + typeLibelle + "</span></b><br> "
                    + this.details;
        });
    }

    public AjustementDTO() {
    }

}
