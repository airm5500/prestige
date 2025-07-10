/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.HMvtProduit;
import dal.TBonLivraisonDetail;
import dal.TDeconditionnement;
import dal.TFamille;
import dal.TMotifRetour;
import dal.TRetourFournisseur;
import dal.TRetourFournisseurDetail;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class RetourDetailsDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String operateur;
    private Date dateOperation;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private String lgRETOURFRSDETAIL, strNAME, intCIP, strLIBELLE, motif, dtCREATED, HEURE, produitId, lgMOTIFRETOUR,
            lgRETOURFRSID;
    private Integer intNUMBERRETURN = 0, intNUMBERANSWER = 0, qtyMvt = 0, prixPaf = 0, intSTOCK, ecart;
    private String strCOMMENTAIRE, strREFRETOURFRS;
    private String referenceBl;

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    public String getStrREFRETOURFRS() {
        return strREFRETOURFRS;
    }

    public void setStrREFRETOURFRS(String strREFRETOURFRS) {
        this.strREFRETOURFRS = strREFRETOURFRS;
    }

    public String getOperateur() {
        return operateur;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public Integer getPrixPaf() {
        return prixPaf;
    }

    public void setPrixPaf(Integer prixPaf) {
        this.prixPaf = prixPaf;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getLgRETOURFRSDETAIL() {
        return lgRETOURFRSDETAIL;
    }

    public void setLgRETOURFRSDETAIL(String lgRETOURFRSDETAIL) {
        this.lgRETOURFRSDETAIL = lgRETOURFRSDETAIL;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public String getLgRETOURFRSID() {
        return lgRETOURFRSID;
    }

    public void setLgRETOURFRSID(String lgRETOURFRSID) {
        this.lgRETOURFRSID = lgRETOURFRSID;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
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

    public Integer getIntNUMBERRETURN() {
        return intNUMBERRETURN;
    }

    public void setIntNUMBERRETURN(Integer intNUMBERRETURN) {
        this.intNUMBERRETURN = intNUMBERRETURN;
    }

    public Integer getIntNUMBERANSWER() {
        return intNUMBERANSWER;
    }

    public void setIntNUMBERANSWER(Integer intNUMBERANSWER) {
        this.intNUMBERANSWER = intNUMBERANSWER;
    }

    public String getLgMOTIFRETOUR() {
        return lgMOTIFRETOUR;
    }

    public void setLgMOTIFRETOUR(String lgMOTIFRETOUR) {
        this.lgMOTIFRETOUR = lgMOTIFRETOUR;
    }

    public Integer getEcart() {
        return ecart;
    }

    public void setEcart(Integer ecart) {
        this.ecart = ecart;
    }

    public RetourDetailsDTO(TRetourFournisseurDetail d) {
        TRetourFournisseur f = d.getLgRETOURFRSID();
        TFamille tf = d.getLgFAMILLEID();
        TUser tu = f.getLgUSERID();
        this.operateur = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.strREFRETOURFRS = f.getStrREFRETOURFRS();
        this.strCOMMENTAIRE = f.getStrCOMMENTAIRE();
        this.dateOperation = f.getDtUPDATED();
        this.lgRETOURFRSDETAIL = d.getLgRETOURFRSDETAIL();
        this.strNAME = tf.getStrNAME();
        this.produitId = tf.getLgFAMILLEID();
        this.intCIP = tf.getIntCIP();
        this.strLIBELLE = f.getLgGROSSISTEID().getStrLIBELLE();
        TMotifRetour motifRetour = d.getLgMOTIFRETOUR();
        if (motifRetour != null) {
            this.motif = motifRetour.getStrLIBELLE();
        }

        this.dtCREATED = dateFormat.format(d.getDtUPDATED());
        this.HEURE = heureFormat.format(d.getDtUPDATED());
        this.intNUMBERANSWER = d.getIntNUMBERANSWER();

        this.intNUMBERRETURN = d.getIntNUMBERRETURN();

        TBonLivraisonDetail bonLivraisonDetail = d.getBonLivraisonDetail();
        if (bonLivraisonDetail != null) {
            this.referenceBl = bonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON();
        }
        this.prixPaf = d.getIntPAF();
        this.intSTOCK = d.getIntSTOCK();
        this.ecart = d.getIntSTOCK() - d.getIntNUMBERRETURN();
        this.lgRETOURFRSID = d.getLgRETOURFRSID().getLgRETOURFRSID();
    }

    public String getReferenceBl() {
        return referenceBl;
    }

    public void setReferenceBl(String referenceBl) {
        this.referenceBl = referenceBl;
    }

    public RetourDetailsDTO(TDeconditionnement d) {
        TUser tu = d.getLgUSERID();
        this.operateur = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.dateOperation = d.getDtUPDATED();
        this.dtCREATED = dateFormat.format(d.getDtUPDATED());
        this.HEURE = heureFormat.format(d.getDtUPDATED());
        this.intNUMBERRETURN = d.getIntNUMBER();
    }

    public RetourDetailsDTO(HMvtProduit d) {
        TUser tu = d.getLgUSERID();
        this.operateur = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.dateOperation = DateConverter.convertLocalDateTimeToDate(d.getCreatedAt());
        this.dtCREATED = d.getMvtDate().format(DateTimeFormatter.ofPattern("dd/MM/yyy"));
        this.HEURE = d.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm"));
        this.intNUMBERRETURN = d.getQteMvt();

    }

    public Integer getQtyMvt() {
        return qtyMvt;
    }

    public void setQtyMvt(Integer qtyMvt) {
        this.qtyMvt = qtyMvt;
    }

    public Integer getIntSTOCK() {
        return intSTOCK;
    }

    public void setIntSTOCK(Integer intSTOCK) {
        this.intSTOCK = intSTOCK;
    }

    public RetourDetailsDTO(HMvtProduit d, boolean inventaire) {
        TUser tu = d.getLgUSERID();
        this.operateur = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.dateOperation = DateConverter.convertLocalDateTimeToDate(d.getCreatedAt());
        this.dtCREATED = d.getMvtDate().format(DateTimeFormatter.ofPattern("dd/MM/yyy"));
        this.HEURE = d.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm"));
        ;
        this.intNUMBERRETURN = d.getQteDebut();
        this.intNUMBERANSWER = d.getQteFinale();
        this.qtyMvt = d.getQteMvt();
    }

    public RetourDetailsDTO() {
    }

}
