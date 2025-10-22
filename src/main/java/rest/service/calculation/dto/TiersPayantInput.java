package rest.service.calculation.dto;

import java.math.BigDecimal;
import java.util.Objects;

public class TiersPayantInput {

    private String clientTiersPayantId;
    private String tiersPayantId;
    private String numBon;
    private String tiersPayantFullName;
    private float taux;
    private BigDecimal plafondConso;
    private BigDecimal consoMensuelle = BigDecimal.ZERO;
    private BigDecimal plafondJournalierClient;
    private int priorite;

    public String getClientTiersPayantId() {
        return clientTiersPayantId;
    }

    public void setClientTiersPayantId(String clientTiersPayantId) {
        this.clientTiersPayantId = clientTiersPayantId;
    }

    public String getTiersPayantFullName() {
        return tiersPayantFullName;
    }

    public void setTiersPayantFullName(String tiersPayantFullName) {
        this.tiersPayantFullName = tiersPayantFullName;
    }

    public float getTaux() {
        return taux;
    }

    public String getNumBon() {
        return numBon;
    }

    public void setNumBon(String numBon) {
        this.numBon = numBon;
    }

    public void setTaux(float taux) {
        this.taux = taux;
    }

    public BigDecimal getPlafondConso() {
        return plafondConso;
    }

    public void setPlafondConso(BigDecimal plafondConso) {
        if (Objects.nonNull(plafondConso)) {
            this.plafondConso = plafondConso.max(BigDecimal.ZERO);
        } else {
            this.plafondConso = plafondConso;
        }

    }

    public BigDecimal getConsoMensuelle() {
        return consoMensuelle;
    }

    public void setConsoMensuelle(BigDecimal consoMensuelle) {

        if (Objects.nonNull(consoMensuelle)) {
            this.consoMensuelle = consoMensuelle.max(BigDecimal.ZERO);
        } else {
            this.consoMensuelle = consoMensuelle;
        }
    }

    public BigDecimal getPlafondJournalierClient() {
        return plafondJournalierClient;
    }

    public void setPlafondJournalierClient(BigDecimal plafondJournalierClient) {

        if (Objects.nonNull(plafondJournalierClient)) {
            this.plafondJournalierClient = plafondJournalierClient.max(BigDecimal.ZERO);
        } else {
            this.plafondJournalierClient = plafondJournalierClient;
        }

    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public int getPriorite() {
        return priorite;
    }

    public void setPriorite(int priorite) {
        this.priorite = priorite;
    }

    @Override
    public String toString() {
        return "TiersPayantInput{" + "clientTiersPayantId=" + clientTiersPayantId + ", tiersPayantId=" + tiersPayantId
                + ", tiersPayantFullName=" + tiersPayantFullName + ", taux=" + taux + ", plafondConso=" + plafondConso
                + ", consoMensuelle=" + consoMensuelle + ", plafondJournalierClient=" + plafondJournalierClient
                + ", priorite=" + priorite + '}';
    }

}
