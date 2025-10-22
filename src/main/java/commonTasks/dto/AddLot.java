package commonTasks.dto;

/**
 *
 * @author koben
 */
public class AddLot {
    private String produitId;
    private String numLot;
    private int quantity = 1;
    private String datePeremption;

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getDatePeremption() {
        return datePeremption;
    }

    public void setDatePeremption(String datePeremption) {
        this.datePeremption = datePeremption;
    }

    public String getNumLot() {
        return numLot;
    }

    public void setNumLot(String numLot) {
        this.numLot = numLot;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

}
