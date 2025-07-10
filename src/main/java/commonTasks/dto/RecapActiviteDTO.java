/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author DICI
 */
public class RecapActiviteDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private long montantTTC = 0;
    private long montantHT = 0;
    private long montantTVA = 0;
    int pourcentageEsp = 0;
    int pourcentageCredit = 0;
    private long montantNet = 0;
    private long marge = 0;
    private long montantRemise = 0;
    private long montantEsp = 0;
    private long montantCredit = 0;
    private long montantTotalMvt = 0;
    private long montantTotalTTC = 0;
    private long montantTotalHT = 0;
    private long montantTotalTVA = 0;
    private long montantRegle = 0;
    private long montantMobilePayment;
    private double ratio;
    private List<RecapActiviteReglementDTO> reglements = new ArrayList<>();
    private List<RecapActiviteReglementDTO> mvtsCaisse = new ArrayList<>();
    private List<AchatDTO> achats = new ArrayList<>();

    public long getMarge() {
        return marge;
    }

    public long getMontantMobilePayment() {
        return montantMobilePayment;
    }

    public void setMontantMobilePayment(long montantMobilePayment) {
        this.montantMobilePayment = montantMobilePayment;
    }

    public double getRatio() {
        return ratio;
    }

    public long getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(long montantRegle) {
        this.montantRegle = montantRegle;
    }

    public void setRatio(double ratio) {
        this.ratio = ratio;
    }

    public long getMontantTotalTTC() {
        return montantTotalTTC;
    }

    public void setMontantTotalTTC(long montantTotalTTC) {
        this.montantTotalTTC = montantTotalTTC;
    }

    public long getMontantTotalHT() {
        return montantTotalHT;
    }

    public void setMontantTotalHT(long montantTotalHT) {
        this.montantTotalHT = montantTotalHT;
    }

    public long getMontantTotalTVA() {
        return montantTotalTVA;
    }

    public void setMontantTotalTVA(long montantTotalTVA) {
        this.montantTotalTVA = montantTotalTVA;
    }

    public void setMarge(long marge) {
        this.marge = marge;
    }

    public long getMontantTTC() {
        return montantTTC;
    }

    public void setMontantTTC(long montantTTC) {
        this.montantTTC = montantTTC;
    }

    public long getMontantHT() {
        return montantHT;
    }

    public void setMontantHT(long montantHT) {
        this.montantHT = montantHT;
    }

    public long getMontantTVA() {
        return montantTVA;
    }

    public void setMontantTVA(long montantTVA) {
        this.montantTVA = montantTVA;
    }

    public int getPourcentageEsp() {
        return pourcentageEsp;
    }

    public void setPourcentageEsp(int pourcentageEsp) {
        this.pourcentageEsp = pourcentageEsp;
    }

    public int getPourcentageCredit() {
        return pourcentageCredit;
    }

    public void setPourcentageCredit(int pourcentageCredit) {
        this.pourcentageCredit = pourcentageCredit;
    }

    public long getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(long montantNet) {
        this.montantNet = montantNet;
    }

    public long getMontantRemise() {
        return montantRemise;
    }

    public void setMontantRemise(long montantRemise) {
        this.montantRemise = montantRemise;
    }

    public long getMontantEsp() {
        return montantEsp;
    }

    public void setMontantEsp(long montantEsp) {
        this.montantEsp = montantEsp;
    }

    public long getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(long montantCredit) {
        this.montantCredit = montantCredit;
    }

    public long getMontantTotalMvt() {
        return montantTotalMvt;
    }

    public void setMontantTotalMvt(long montantTotalMvt) {
        this.montantTotalMvt = montantTotalMvt;
    }

    public List<RecapActiviteReglementDTO> getReglements() {
        return reglements;
    }

    public void setReglements(List<RecapActiviteReglementDTO> reglements) {
        this.reglements = reglements;
    }

    public List<RecapActiviteReglementDTO> getMvtsCaisse() {
        return mvtsCaisse;
    }

    public void setMvtsCaisse(List<RecapActiviteReglementDTO> mvtsCaisse) {
        this.mvtsCaisse = mvtsCaisse;
    }

    public List<AchatDTO> getAchats() {
        return achats;
    }

    public void setAchats(List<AchatDTO> achats) {
        this.achats = achats;
    }

}
