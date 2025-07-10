package rest.service.v2.dto;

import commonTasks.dto.VenteReglementDTO;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import util.DateConverter;
import util.NumberUtils;

/**
 *
 * @author koben
 */
public class VisualisationCaisseDTO {

    private int mobile;
    private int espece;
    private int carteBancaire;
    private int cheque;
    private int differe;
    private int virement;
    private String typeMouvement;
    private String reference;
    private String operateur;
    private String client;
    private String modeReglement;
    private LocalDateTime dateOperation;
    private int montant;
    private int montantNet;
    private int montantBrut;
    private int montantCaisse;
    private int montantCredit;
    private String numeroComptable;
    private String taskDate;
    private String taskHeure;
    private String modeRegle;
    private String typeMvt;
    private String operateurId;
    private String mvtId;
    private VenteModeReglementDTO venteModeReglement;
    private List<VisualisationCaisseDTO> datas = new ArrayList<>();
    private List<VenteReglementDTO> reglements = new ArrayList<>();
    private String items = "";

    public String getItems() {

        reglements.forEach(tpd -> {
            items = "<span style='display:inline-block;width: 25%;'>" + tpd.getTypeReglement()
                    + "</span><span style='display:inline-block;width: 15%;'>"
                    + NumberUtils.formatIntToString(tpd.getMontant()) + "</span></b><br> " + items;
        });

        return items;
    }

    public void setItems(String items) {
        this.items = items;
    }

    public VenteModeReglementDTO getVenteModeReglement() {
        return venteModeReglement;
    }

    public void setVenteModeReglement(VenteModeReglementDTO venteModeReglement) {
        this.venteModeReglement = venteModeReglement;
    }

    public String getTypeMouvement() {
        return typeMouvement;
    }

    public List<VisualisationCaisseDTO> getDatas() {
        return datas;
    }

    public void setDatas(List<VisualisationCaisseDTO> datas) {
        this.datas = datas;
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

    public int getMontant() {
        return montant;
    }

    public void setMontant(int montant) {
        this.montant = montant;
    }

    public int getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(int montantNet) {
        this.montantNet = montantNet;
    }

    public int getMontantBrut() {
        return montantBrut;
    }

    public void setMontantBrut(int montantBrut) {
        this.montantBrut = montantBrut;
    }

    public int getMontantCaisse() {
        return montantCaisse;
    }

    public void setMontantCaisse(int montantCaisse) {
        this.montantCaisse = montantCaisse;
    }

    public int getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(int montantCredit) {
        this.montantCredit = montantCredit;
    }

    public String getNumeroComptable() {
        return numeroComptable;
    }

    public void setNumeroComptable(String numeroComptable) {
        this.numeroComptable = numeroComptable;
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

    public String getModeRegle() {
        return modeRegle;
    }

    public void setModeRegle(String modeRegle) {
        this.modeRegle = modeRegle;
    }

    public String getTypeMvt() {
        return typeMvt;
    }

    public void setTypeMvt(String typeMvt) {
        this.typeMvt = typeMvt;
    }

    public String getOperateurId() {
        return operateurId;
    }

    public void setOperateurId(String operateurId) {
        this.operateurId = operateurId;
    }

    public String getMvtId() {
        return mvtId;
    }

    public void setMvtId(String mvtId) {
        this.mvtId = mvtId;
    }

    public List<VenteReglementDTO> getReglements() {
        return reglements;
    }

    public void setReglements(List<VenteReglementDTO> reglements) {
        this.reglements = reglements;
    }

    public int getMobile() {
        return mobile;
    }

    public void setMobile(int mobile) {
        this.mobile = mobile;
    }

    public int getEspece() {
        return espece;
    }

    public void setEspece(int espece) {
        this.espece = espece;
    }

    public int getCarteBancaire() {
        return carteBancaire;
    }

    public void setCarteBancaire(int carteBancaire) {
        this.carteBancaire = carteBancaire;
    }

    public int getCheque() {
        return cheque;
    }

    public void setCheque(int cheque) {
        this.cheque = cheque;
    }

    public int getDiffere() {
        return differe;
    }

    public void setDiffere(int differe) {
        this.differe = differe;
    }

    public int getVirement() {
        return virement;
    }

    public void setVirement(int virement) {
        this.virement = virement;
    }

}
