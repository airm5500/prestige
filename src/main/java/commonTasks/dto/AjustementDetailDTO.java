/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.MotifAjustement;
import dal.TAjustement;
import dal.TAjustementDetail;
import dal.TFamille;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 *
 * @author DICI
 */
public class AjustementDetailDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgAJUSTEMENTDETAILID, lgFAMILLEID, lgAJUSTEMENTID, intCIP, strNAME, dtCREATED, HEURE;
    private Integer intNUMBER, intPRICE, intPAF;
    private Integer intNUMBERCURRENTSTOCK;
    private Integer intNUMBERAFTERSTOCK, montantTotal, montantVente;
    private Date dateOperation;
    private String operateur, motifAjustement, commentaire;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");

    public String getOperateur() {
        return operateur;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public String getMotifAjustement() {
        return motifAjustement;
    }

    public void setMotifAjustement(String motifAustement) {
        this.motifAjustement = motifAustement;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getHEURE() {
        return HEURE;
    }

    public void setHEURE(String HEURE) {
        this.HEURE = HEURE;
    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public String getLgAJUSTEMENTDETAILID() {
        return lgAJUSTEMENTDETAILID;
    }

    public void setLgAJUSTEMENTDETAILID(String lgAJUSTEMENTDETAILID) {
        this.lgAJUSTEMENTDETAILID = lgAJUSTEMENTDETAILID;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getLgAJUSTEMENTID() {
        return lgAJUSTEMENTID;
    }

    public void setLgAJUSTEMENTID(String lgAJUSTEMENTID) {
        this.lgAJUSTEMENTID = lgAJUSTEMENTID;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntNUMBERCURRENTSTOCK() {
        return intNUMBERCURRENTSTOCK;
    }

    public void setIntNUMBERCURRENTSTOCK(Integer intNUMBERCURRENTSTOCK) {
        this.intNUMBERCURRENTSTOCK = intNUMBERCURRENTSTOCK;
    }

    public Integer getIntNUMBERAFTERSTOCK() {
        return intNUMBERAFTERSTOCK;
    }

    public void setIntNUMBERAFTERSTOCK(Integer intNUMBERAFTERSTOCK) {
        this.intNUMBERAFTERSTOCK = intNUMBERAFTERSTOCK;
    }

    public Integer getMontantTotal() {
        return montantTotal;
    }

    public void setMontantTotal(Integer montantTotal) {
        this.montantTotal = montantTotal;
    }

    public AjustementDetailDTO() {
    }

    public AjustementDetailDTO(TAjustementDetail ajustementDetail) {
        this.lgAJUSTEMENTDETAILID = ajustementDetail.getLgAJUSTEMENTDETAILID();
        TFamille famille = ajustementDetail.getLgFAMILLEID();
        this.lgFAMILLEID = famille.getLgFAMILLEID();
        this.intCIP = famille.getIntCIP();
        this.strNAME = famille.getStrNAME();
        this.intPAF = famille.getIntPAF();
        this.intNUMBER = ajustementDetail.getIntNUMBER();
        this.intPRICE = famille.getIntPRICE();
        this.intNUMBERCURRENTSTOCK = ajustementDetail.getIntNUMBERCURRENTSTOCK();
        this.intNUMBERAFTERSTOCK = ajustementDetail.getIntNUMBERAFTERSTOCK();
        this.montantTotal = ajustementDetail.getIntNUMBER() * famille.getIntPAF();
        this.montantVente = ajustementDetail.getIntNUMBER() * famille.getIntPRICE();
        this.dtCREATED = dateFormat.format(ajustementDetail.getDtUPDATED());
        this.HEURE = heureFormat.format(ajustementDetail.getDtUPDATED());
        TAjustement a = ajustementDetail.getLgAJUSTEMENTID();
        TUser tu = a.getLgUSERID();
        this.commentaire = a.getStrCOMMENTAIRE();
        this.lgAJUSTEMENTID = a.getLgAJUSTEMENTID();
        this.operateur = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.dateOperation = ajustementDetail.getDtUPDATED();
        MotifAjustement ma = ajustementDetail.getTypeAjustement();
        if (ma != null) {
            this.motifAjustement = ma.getLibelle();
        }
    }

}
