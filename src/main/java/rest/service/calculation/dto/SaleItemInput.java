package rest.service.calculation.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class SaleItemInput {
    // private Long produitId;
    private String salesLineId;
    private Integer quantity;
    private BigDecimal regularUnitPrice;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private List<TiersPayantPrixInput> prixAssurances = new ArrayList<>();
    private BigDecimal totalSalesAmount;
    /**
     * Retour du 10/11/2026 : compte client tiers-payant qui passe en premier sur la ligne et prend 100 % de sa propre
     * base (prise en charge totale). Null (defaut) : calcul habituel de la ligne.
     */
    private String premierCompteTiersPayantId;

    public String getPremierCompteTiersPayantId() {
        return premierCompteTiersPayantId;
    }

    public void setPremierCompteTiersPayantId(String premierCompteTiersPayantId) {
        this.premierCompteTiersPayantId = premierCompteTiersPayantId;
    }

    public String getSalesLineId() {
        return salesLineId;
    }

    public void setSalesLineId(String salesLineId) {
        this.salesLineId = salesLineId;
    }

    public BigDecimal getTotalSalesAmount() {
        return totalSalesAmount;
    }

    public void setTotalSalesAmount(BigDecimal totalSalesAmount) {
        this.totalSalesAmount = totalSalesAmount;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getRegularUnitPrice() {
        return regularUnitPrice;
    }

    public void setRegularUnitPrice(BigDecimal regularUnitPrice) {
        this.regularUnitPrice = regularUnitPrice;
    }

    public List<TiersPayantPrixInput> getPrixAssurances() {
        return prixAssurances;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public void setPrixAssurances(List<TiersPayantPrixInput> prixAssurances) {
        this.prixAssurances = prixAssurances;
    }

    @Override
    public String toString() {
        return "SaleItemInput{" + "salesLineId=" + salesLineId + ", quantity=" + quantity + ", regularUnitPrice="
                + regularUnitPrice + ", discountAmount=" + discountAmount + ", prixAssurances=" + prixAssurances
                + ", totalSalesAmount=" + totalSalesAmount + '}';
    }

}
