package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne de la balance agee detaillee (une ligne par tiers payant).
 */
public class BalanceAgeeDetailDTO implements Serializable {

    private String tiersPayantId;
    private String tiersPayant;
    private long nbProduits;
    private long nbDossiers;
    private long montant;

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(String tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public long getNbProduits() {
        return nbProduits;
    }

    public void setNbProduits(long nbProduits) {
        this.nbProduits = nbProduits;
    }

    public long getNbDossiers() {
        return nbDossiers;
    }

    public void setNbDossiers(long nbDossiers) {
        this.nbDossiers = nbDossiers;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }
}
