package rest.service.calculation.dto;

import java.math.BigDecimal;
import java.util.List;

public class CalculationInput {
    private List<SaleItemInput> saleItems;
    private List<TiersPayantInput> tiersPayants;
    private NatureVente natureVente;
    private BigDecimal discountAmount;
    private BigDecimal totalSalesAmount;
    /**
     * Lot « base par tiers-payant » (Q2.5) : vrai si KEY_PRIX_REF_BASE_PAR_TP vaut 1. Faux par defaut : la regle du
     * minimum des prix de reference s'applique, exactement comme avant ce lot.
     */
    private boolean basePrixReferenceParTiersPayant;

    public List<SaleItemInput> getSaleItems() {
        return saleItems;
    }

    public void setSaleItems(List<SaleItemInput> saleItems) {
        this.saleItems = saleItems;
    }

    public List<TiersPayantInput> getTiersPayants() {
        return tiersPayants;
    }

    public void setTiersPayants(List<TiersPayantInput> tiersPayants) {
        this.tiersPayants = tiersPayants;
    }

    public NatureVente getNatureVente() {
        return natureVente;
    }

    public void setNatureVente(NatureVente natureVente) {
        this.natureVente = natureVente;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getTotalSalesAmount() {
        return totalSalesAmount;
    }

    public void setTotalSalesAmount(BigDecimal totalSalesAmount) {
        this.totalSalesAmount = totalSalesAmount;
    }

    public boolean isBasePrixReferenceParTiersPayant() {
        return basePrixReferenceParTiersPayant;
    }

    public void setBasePrixReferenceParTiersPayant(boolean basePrixReferenceParTiersPayant) {
        this.basePrixReferenceParTiersPayant = basePrixReferenceParTiersPayant;
    }

    @Override
    public String toString() {
        return "CalculationInput{" + "saleItems=" + saleItems + ", tiersPayants=" + tiersPayants + ", natureVente="
                + natureVente + ", discountAmount=" + discountAmount + ", totalSalesAmount=" + totalSalesAmount + '}';
    }

}
