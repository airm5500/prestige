package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne du recapitulatif de la balance agee (une ligne par periode).
 */
public class BalanceAgeeRecapDTO implements Serializable {

    private String periode;
    private long nbFactures;
    private long nbDossiersFactures;
    private long nbDossiersNonFactures;
    private long montantFacture;
    private long montantNonFacture;

    public String getPeriode() {
        return periode;
    }

    public void setPeriode(String periode) {
        this.periode = periode;
    }

    public long getNbFactures() {
        return nbFactures;
    }

    public void setNbFactures(long nbFactures) {
        this.nbFactures = nbFactures;
    }

    public long getNbDossiersFactures() {
        return nbDossiersFactures;
    }

    public void setNbDossiersFactures(long nbDossiersFactures) {
        this.nbDossiersFactures = nbDossiersFactures;
    }

    public long getNbDossiersNonFactures() {
        return nbDossiersNonFactures;
    }

    public void setNbDossiersNonFactures(long nbDossiersNonFactures) {
        this.nbDossiersNonFactures = nbDossiersNonFactures;
    }

    public long getMontantFacture() {
        return montantFacture;
    }

    public void setMontantFacture(long montantFacture) {
        this.montantFacture = montantFacture;
    }

    public long getMontantNonFacture() {
        return montantNonFacture;
    }

    public void setMontantNonFacture(long montantNonFacture) {
        this.montantNonFacture = montantNonFacture;
    }

    public long getTotalDossiers() {
        return nbDossiersFactures + nbDossiersNonFactures;
    }

    public long getTotalMontant() {
        return montantFacture + montantNonFacture;
    }
}
