/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;

/**
 *
 * @author DICI
 */
public class SummaryDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    long montantTTC = 0, montantNet = 0, montantRemise = 0, pourcentage = 0, panierMoyen = 0, montantEsp = 0,
            montantCheque = 0, montantVirement = 0, montantCB = 0, montantTp = 0, montantDiff = 0, nbreVente = 0,
            fondCaisse = 0, montantRegDiff = 0, montantMobilePayment = 0, montantRegleTp = 0, montantEntre = 0,
            montantAchat = 0, montantSortie = 0, marge = 0, montantTva = 0, montantHT = 0;
    double ratioVA = 0.0, rationAV = 0.0;

    public long getMontantTTC() {
        return montantTTC;
    }

    public long getMontantTva() {
        return montantTva;
    }

    public long getMontantHT() {
        return montantHT;
    }

    public long getMontantMobilePayment() {
        return montantMobilePayment;
    }

    public void setMontantMobilePayment(long montantMobilePayment) {
        this.montantMobilePayment = montantMobilePayment;
    }

    public void setMontantHT(long montantHT) {
        this.montantHT = montantHT;
    }

    public void setMontantTva(long montantTva) {
        this.montantTva = montantTva;
    }

    public void setMontantTTC(long montantTTC) {
        this.montantTTC = montantTTC;
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

    public long getPourcentage() {
        return pourcentage;
    }

    public void setPourcentage(long pourcentage) {
        this.pourcentage = pourcentage;
    }

    public long getPanierMoyen() {
        return panierMoyen;
    }

    public void setPanierMoyen(long panierMoyen) {
        this.panierMoyen = panierMoyen;
    }

    public long getMontantEsp() {
        return montantEsp;
    }

    public void setMontantEsp(long montantEsp) {
        this.montantEsp = montantEsp;
    }

    public long getMontantCheque() {
        return montantCheque;
    }

    public void setMontantCheque(long montantCheque) {
        this.montantCheque = montantCheque;
    }

    public long getMontantVirement() {
        return montantVirement;
    }

    public void setMontantVirement(long montantVirement) {
        this.montantVirement = montantVirement;
    }

    public long getMontantCB() {
        return montantCB;
    }

    public void setMontantCB(long montantCB) {
        this.montantCB = montantCB;
    }

    public long getMontantTp() {
        return montantTp;
    }

    public void setMontantTp(long montantTp) {
        this.montantTp = montantTp;
    }

    public long getMontantDiff() {
        return montantDiff;
    }

    public void setMontantDiff(long montantDiff) {
        this.montantDiff = montantDiff;
    }

    public long getNbreVente() {
        return nbreVente;
    }

    public void setNbreVente(long nbreVente) {
        this.nbreVente = nbreVente;
    }

    public long getFondCaisse() {
        return fondCaisse;
    }

    public void setFondCaisse(long fondCaisse) {
        this.fondCaisse = fondCaisse;
    }

    public long getMontantRegDiff() {
        return montantRegDiff;
    }

    public void setMontantRegDiff(long montantRegDiff) {
        this.montantRegDiff = montantRegDiff;
    }

    public long getMontantRegleTp() {
        return montantRegleTp;
    }

    public void setMontantRegleTp(long montantRegleTp) {
        this.montantRegleTp = montantRegleTp;
    }

    public long getMontantEntre() {
        return montantEntre;
    }

    public void setMontantEntre(long montantEntre) {
        this.montantEntre = montantEntre;
    }

    public long getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(long montantAchat) {
        this.montantAchat = montantAchat;
    }

    public long getMontantSortie() {
        return montantSortie;
    }

    public void setMontantSortie(long montantSortie) {
        this.montantSortie = montantSortie;
    }

    public long getMarge() {
        return marge;
    }

    public void setMarge(long marge) {
        this.marge = marge;
    }

    public double getRatioVA() {
        return ratioVA;
    }

    public void setRatioVA(double ratioVA) {
        this.ratioVA = ratioVA;
    }

    public double getRationAV() {
        return rationAV;
    }

    public void setRationAV(double rationAV) {
        this.rationAV = rationAV;
    }

    public SummaryDTO(long montantTTC, long montantRemise) {
        this.montantTTC = montantTTC;
        this.montantRemise = montantRemise;
        this.montantNet = montantTTC - montantRemise;
    }

    public SummaryDTO() {
    }

    @Override
    public String toString() {
        return "SummaryDTO{" + "montantTTC=" + montantTTC + ", montantNet=" + montantNet + ", montantRemise="
                + montantRemise + ", pourcentage=" + pourcentage + ", panierMoyen=" + panierMoyen + ", montantEsp="
                + montantEsp + ", montantCheque=" + montantCheque + ", MontantVirement=" + montantVirement
                + ", montantCB=" + montantCB + ", montantTp=" + montantTp + ", montantDiff=" + montantDiff
                + ", nbreVente=" + nbreVente + ", fondCaisse=" + fondCaisse + ", montantRegDiff=" + montantRegDiff
                + ", montantRegleTp=" + montantRegleTp + ", montantEntre=" + montantEntre + ", montantAchat="
                + montantAchat + ", montantSortie=" + montantSortie + ", marge=" + marge + ", ratioVA=" + ratioVA
                + ", rationAV=" + rationAV + '}';
    }

}
