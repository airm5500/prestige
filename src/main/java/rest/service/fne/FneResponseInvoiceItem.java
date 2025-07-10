package rest.service.fne;

import java.util.List;

/**
 *
 * @author koben
 */
public class FneResponseInvoiceItem {

    private String id;
    private int quantity;
    private String reference;
    private String description;
    private Integer amount;
    private List<FneResponseTaxe> taxes;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
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

    public List<FneResponseTaxe> getTaxes() {
        return taxes;
    }

    public void setTaxes(List<FneResponseTaxe> taxes) {
        this.taxes = taxes;
    }

    @Override
    public String toString() {
        return "FneResponseInvoiceItem{" + "id=" + id + ", quantity=" + quantity + ", reference=" + reference
                + ", description=" + description + ", amount=" + amount + ", taxes=" + taxes + '}';
    }

}
