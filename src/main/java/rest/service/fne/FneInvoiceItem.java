package rest.service.fne;

import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class FneInvoiceItem {

    private final int quantity = 1;
    private final String[] taxes = { "TVAD" };
    private String reference;
    @NotNull
    private String description;
    @NotNull
    private Integer amount;
    private String measurementUnit;

    public String getReference() {
        return reference;
    }

    public String[] getTaxes() {
        return taxes;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getMeasurementUnit() {
        return measurementUnit;
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

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    @Override
    public String toString() {
        return "FneInvoiceItem{" + "taxes=" + taxes + ", reference=" + reference + ", description=" + description
                + ", amount=" + amount + ", quantity=" + quantity + '}';
    }

}
