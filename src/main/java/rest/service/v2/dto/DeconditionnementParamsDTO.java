package rest.service.v2.dto;

/**
 *
 * @author koben
 */
public class DeconditionnementParamsDTO {

    private String produitId;
    private int quantity;

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

}
