package rest.service.calculation.dto;

import java.math.BigDecimal;

public class TiersPayantLineOutput {
    private String clientTiersPayantId;
    private String numBon;
    private BigDecimal montant;
    private int finalTaux;
    // Taux reellement utilise par le calcul (contractuel ou saisi en caisse) : celui a memoriser
    // sur la ligne de vente et a imprimer, contrairement a finalTaux (part ecretee / total).
    private int tauxApplique;

    public String getClientTiersPayantId() {
        return clientTiersPayantId;
    }

    public void setClientTiersPayantId(String clientTiersPayantId) {
        this.clientTiersPayantId = clientTiersPayantId;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public void setMontant(BigDecimal montant) {
        this.montant = montant;
    }

    public int getFinalTaux() {
        return finalTaux;
    }

    public void setFinalTaux(int finalTaux) {
        this.finalTaux = finalTaux;
    }

    public int getTauxApplique() {
        return tauxApplique;
    }

    public void setTauxApplique(int tauxApplique) {
        this.tauxApplique = tauxApplique;
    }

    public String getNumBon() {
        return numBon;
    }

    public void setNumBon(String numBon) {
        this.numBon = numBon;
    }

    @Override
    public String toString() {
        return "TiersPayantLineOutput{" + "clientTiersPayantId=" + clientTiersPayantId + ", numBon=" + numBon
                + ", montant=" + montant + ", finalTaux=" + finalTaux + '}';
    }

}
