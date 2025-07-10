
package rest.service.dto;

import dal.enumeration.TypeTransaction;

/**
 *
 * @author koben
 */
public class MvtTransactionDTO {

    private TypeTransaction typeTransaction;
    long montantTTC = 0, montantNet = 0, montantRemise = 0, panierMoyen = 0, montantEsp = 0, montantCheque = 0,
            MontantVirement = 0, montantCB = 0, montantDiff = 0, nbreVente = 0, montantMobilePayment = 0;
    private CodeInfo typeReglement;

    public TypeTransaction getTypeTransaction() {
        return typeTransaction;
    }

    public CodeInfo getTypeReglement() {
        return typeReglement;
    }

    public void setTypeReglement(CodeInfo typeReglement) {
        this.typeReglement = typeReglement;
    }

    public void setTypeTransaction(TypeTransaction typeTransaction) {
        this.typeTransaction = typeTransaction;
    }

    public long getMontantTTC() {
        return montantTTC;
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
        return MontantVirement;
    }

    public void setMontantVirement(long MontantVirement) {
        this.MontantVirement = MontantVirement;
    }

    public long getMontantCB() {
        return montantCB;
    }

    public void setMontantCB(long montantCB) {
        this.montantCB = montantCB;
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

    public long getMontantMobilePayment() {
        return montantMobilePayment;
    }

    public void setMontantMobilePayment(long montantMobilePayment) {
        this.montantMobilePayment = montantMobilePayment;
    }

}
