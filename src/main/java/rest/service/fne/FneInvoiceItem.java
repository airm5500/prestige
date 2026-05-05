package rest.service.fne;

import java.util.Arrays;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class FneInvoiceItem {

    private int quantity = 1;
    private String[] taxes = { "TVAD" };
    private String reference;
    @NotNull
    private String description;
    @NotNull
    private Double amount;// envoie double
    private String measurementUnit;
    private Double discount;

    public String getReference() {
        return reference;
    }

    public String[] getTaxes() {
        return taxes;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setTaxes(String[] taxes) {
        this.taxes = taxes;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getMeasurementUnit() {
        return measurementUnit;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public void setMeasurementUnit(String measurementUnit) {
        this.measurementUnit = measurementUnit;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    @Override
    public String toString() {
        return "FneInvoiceItem{" + "taxes=" + Arrays.toString(taxes) + ", reference=" + reference + ", description="
                + description + ", amount=" + amount + ", quantity=" + quantity + '}';
    }

}
