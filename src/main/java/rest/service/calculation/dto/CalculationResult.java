package rest.service.calculation.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CalculationResult {
    private List<CalculatedShare> itemShares = new ArrayList<>();
    private BigDecimal totalRoShare = BigDecimal.ZERO;
    private BigDecimal totalTiersPayant = BigDecimal.ZERO;
    private BigDecimal totalPatientShare = BigDecimal.ZERO;
    private BigDecimal totalSaleAmount = BigDecimal.ZERO;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private List<TiersPayantLineOutput> tiersPayantLines = new ArrayList<>();
    private String warningMessage;

    public List<CalculatedShare> getItemShares() {
        return itemShares;
    }

    public void setItemShares(List<CalculatedShare> itemShares) {
        this.itemShares = itemShares;
    }

    public BigDecimal getTotalRoShare() {
        return totalRoShare;
    }

    public void setTotalRoShare(BigDecimal totalRoShare) {
        this.totalRoShare = totalRoShare;
    }

    public BigDecimal getTotalTiersPayant() {
        return totalTiersPayant;
    }

    public void setTotalTiersPayant(BigDecimal totalTiersPayant) {
        this.totalTiersPayant = totalTiersPayant;
    }

    public BigDecimal getTotalPatientShare() {
        return totalPatientShare;
    }

    public void setTotalPatientShare(BigDecimal totalPatientShare) {
        this.totalPatientShare = totalPatientShare;
    }

    public BigDecimal getTotalSaleAmount() {
        return totalSaleAmount;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public List<TiersPayantLineOutput> getTiersPayantLines() {
        return tiersPayantLines;
    }

    public void setTiersPayantLines(List<TiersPayantLineOutput> tiersPayantLines) {
        this.tiersPayantLines = tiersPayantLines;
    }

    public String getWarningMessage() {
        return warningMessage;
    }

    public void setWarningMessage(String warningMessage) {
        this.warningMessage = warningMessage;
    }

    public void setTotalSaleAmount(BigDecimal totalSaleAmount) {
        this.totalSaleAmount = totalSaleAmount;
    }

    public boolean isHasPriceOption() {
        return itemShares.stream().anyMatch(CalculatedShare::isHasPriceOption);
    }

    @Override
    public String toString() {
        return "CalculationResult{" + "itemShares=" + itemShares + ", totalRoShare=" + totalRoShare
                + ", totalTiersPayant=" + totalTiersPayant + ", totalPatientShare=" + totalPatientShare
                + ", totalSaleAmount=" + totalSaleAmount + ", discountAmount=" + discountAmount + ", tiersPayantLines="
                + tiersPayantLines + ", warningMessage=" + warningMessage + '}';
    }

}
