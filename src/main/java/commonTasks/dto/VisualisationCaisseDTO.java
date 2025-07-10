/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.MvtTransaction;
import dal.TClient;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class VisualisationCaisseDTO implements Serializable {

    private final DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final DateTimeFormatter heureFormat = DateTimeFormatter.ofPattern("HH:mm");
    private String typeMouvement, reference, operateur, client, modeReglement;
    private LocalDateTime dateOperation;
    private Integer montant = 0, montantNet = 0, montantBrut = 0, montantCaisse = 0, montantCredit = 0;
    private String numeroComptable;
    private String taskDate, taskHeure;
    private String id = UUID.randomUUID().toString();
    private String modeRegle, typeMvt;
    private String operateurId;
    private List<VisualisationCaisseDTO> datas = new ArrayList<>();

    public String getOperateurId() {
        return operateurId;
    }

    public void setOperateurId(String operateurId) {
        this.operateurId = operateurId;
    }

    public void setDatas(List<VisualisationCaisseDTO> datas) {
        this.datas = datas;
    }

    public List<VisualisationCaisseDTO> getDatas() {
        return datas;
    }

    public String getTypeMouvement() {
        return typeMouvement;
    }

    public String getId() {
        return id;
    }

    public String getModeRegle() {
        return modeRegle;
    }

    public Integer getMontantCaisse() {
        return montantCaisse;
    }

    public void setMontantCaisse(Integer montantCaisse) {
        this.montantCaisse = montantCaisse;
    }

    public void setModeRegle(String modeRegle) {
        this.modeRegle = modeRegle;
    }

    public Integer getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(Integer montantCredit) {
        this.montantCredit = montantCredit;
    }

    public String getTypeMvt() {
        return typeMvt;
    }

    public void setTypeMvt(String typeMvt) {
        this.typeMvt = typeMvt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTaskDate() {
        return taskDate;
    }

    public void setTaskDate(String taskDate) {
        this.taskDate = taskDate;
    }

    public String getTaskHeure() {
        return taskHeure;
    }

    public void setTaskHeure(String taskHeure) {
        this.taskHeure = taskHeure;
    }

    public String getNumeroComptable() {
        return numeroComptable;
    }

    public void setNumeroComptable(String numeroComptable) {
        this.numeroComptable = numeroComptable;
    }

    public void setTypeMouvement(String typeMouvement) {
        this.typeMouvement = typeMouvement;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getOperateur() {
        return operateur;
    }

    public void setOperateur(String operateur) {

        this.operateur = operateur;
    }

    public String getClient() {
        return client;
    }

    public void setClient(String client) {
        this.client = client;
    }

    public String getModeReglement() {
        return modeReglement;
    }

    public void setModeReglement(String modeReglement) {
        this.modeReglement = modeReglement;
    }

    public LocalDateTime getDateOperation() {

        return dateOperation;
    }

    public void setDateOperation(LocalDateTime dateOperation) {
        this.dateOperation = dateOperation;

    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public VisualisationCaisseDTO() {
    }

    public VisualisationCaisseDTO(String typeMouvement, String reference, String operateur, String client,
            String modeReglement, LocalDateTime dateOperation) {
        this.typeMouvement = typeMouvement;
        this.reference = reference;
        this.operateur = operateur;
        this.client = client;
        this.modeReglement = modeReglement;
        this.dateOperation = dateOperation;
    }

    @Override
    public String toString() {
        return "VisualisationCaisseDTO{" + "typeMouvement=" + typeMouvement + ", reference=" + reference
                + ", operateur=" + operateur + ", client=" + client + ", modeReglement=" + modeReglement
                + ", dateOperation=" + dateOperation + ", montant=" + montant + ", numeroComptable=" + numeroComptable
                + '}';
    }

    public VisualisationCaisseDTO(MvtTransaction m, TClient cl) {

        TTypeMvtCaisse mvt = m.gettTypeMvtCaisse();
        this.typeMouvement = mvt.getStrNAME();
        this.typeMvt = mvt.getLgTYPEMVTCAISSEID();
        this.reference = m.getReference();
        TUser caisse = m.getCaisse();
        this.operateur = caisse.getStrFIRSTNAME() + " " + caisse.getStrLASTNAME();
        this.operateurId = caisse.getLgUSERID();
        if (cl != null) {
            this.client = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }
        switch (mvt.getLgTYPEMVTCAISSEID()) {
        case DateConverter.MVT_REGLE_VNO:
        case DateConverter.MVT_REGLE_VO:
            this.montant = m.getMontantRegle();
            this.montantBrut = m.getMontant();
            this.montantNet = m.getMontantNet();
            this.montantCaisse = m.getMontantPaye();
            this.montantCredit = m.getMontantRestant();
            // this.credit = m.getCategoryTransaction().ordinal();
            break;
        default:
            this.montant = m.getMontant();
            this.montantBrut = m.getMontant();
            this.montantNet = m.getMontant();
            // this.montantCaisse = m.getMontant();
            break;

        }

        TTypeReglement reglement = m.getReglement();
        this.modeReglement = reglement.getStrNAME();
        this.modeRegle = reglement.getLgTYPEREGLEMENTID();
        this.dateOperation = m.getCreatedAt();
        this.taskDate = m.getMvtDate().format(dateFormat);
        this.taskHeure = m.getCreatedAt().format(heureFormat);

    }

    public Integer getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(Integer montantNet) {
        this.montantNet = montantNet;
    }

    public Integer getMontantBrut() {
        return montantBrut;
    }

    public void setMontantBrut(Integer montantBrut) {
        this.montantBrut = montantBrut;
    }

    public VisualisationCaisseDTO(String typeMouvement, String typeMvt, String modeRegle, String libele,
            long montantNet) {
        this.typeMouvement = typeMouvement;
        this.typeMvt = typeMvt;
        this.montantNet = (int) montantNet;
        this.modeRegle = modeRegle;
        this.modeReglement = libele;
    }

    public VisualisationCaisseDTO(MvtTransaction m, TClient cl, TTiersPayant payant) {

        TTypeMvtCaisse mvt = m.gettTypeMvtCaisse();
        this.typeMouvement = mvt.getStrNAME();
        this.typeMvt = mvt.getLgTYPEMVTCAISSEID();
        this.reference = m.getReference();
        TUser caisse = m.getCaisse();
        this.operateur = caisse.getStrFIRSTNAME() + " " + caisse.getStrLASTNAME();
        this.operateurId = caisse.getLgUSERID();
        if (cl != null) {
            this.client = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }
        if (payant != null) {
            this.client = payant.getStrFULLNAME();
        }
        switch (mvt.getLgTYPEMVTCAISSEID()) {
        case DateConverter.MVT_REGLE_VNO:
        case DateConverter.MVT_REGLE_VO:
            this.montant = m.getMontantRegle();
            this.montantBrut = m.getMontant();
            this.montantNet = m.getMontantNet();
            this.montantCaisse = m.getMontantPaye();
            this.montantCredit = m.getMontantRestant();
            break;
        default:
            this.montant = m.getMontant();
            this.montantBrut = m.getMontant();
            this.montantNet = m.getMontant();
            break;

        }

        TTypeReglement reglement = m.getReglement();
        this.modeReglement = reglement.getStrNAME();
        this.modeRegle = reglement.getLgTYPEREGLEMENTID();
        this.dateOperation = m.getCreatedAt();
        this.taskDate = m.getMvtDate().format(dateFormat);
        this.taskHeure = m.getCreatedAt().format(heureFormat);
        this.numeroComptable = mvt.getStrCODECOMPTABLE();
        this.id = UUID.randomUUID().toString();

    }
}
