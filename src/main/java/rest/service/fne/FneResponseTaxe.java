
package rest.service.fne;

/**
 *
 * @author koben
 */
public class FneResponseTaxe {
    private String invoiceItemId;
    private Double amount;
    private String name;
    private String shortName;

    public String getInvoiceItemId() {
        return invoiceItemId;
    }

    public void setInvoiceItemId(String invoiceItemId) {
        this.invoiceItemId = invoiceItemId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getShortName() {
        return shortName;
    }

    public void setShortName(String shortName) {
        this.shortName = shortName;
    }

    @Override
    public String toString() {
        return "FneResponseTaxe{" + "invoiceItemId=" + invoiceItemId + ", amount=" + amount + ", name=" + name
                + ", shortName=" + shortName + '}';
    }

}
