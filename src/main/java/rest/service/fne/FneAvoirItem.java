package rest.service.fne;

/**
 * Ligne d'un avoir FNE : identifiant FNE de l'article (invoice.items[].id de la reponse de certification) et quantite a
 * retourner.
 *
 * @author koben
 */
public class FneAvoirItem {

    private String id;
    private int quantity;

    public FneAvoirItem() {
    }

    public FneAvoirItem(String id, int quantity) {
        this.id = id;
        this.quantity = quantity;
    }

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

    @Override
    public String toString() {
        return "FneAvoirItem{" + "id=" + id + ", quantity=" + quantity + '}';
    }

}
