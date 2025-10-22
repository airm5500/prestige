package rest.service.calculation.dto;

import java.math.BigDecimal;

public class TiersPayantLineOutput {
    private String clientTiersPayantId;
    private String numBon;
    private BigDecimal montant;
    private int finalTaux;

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

    public String getNumBon() {
        return numBon;
    }

    public void setNumBon(String numBon) {
        this.numBon = numBon;
    }

}
