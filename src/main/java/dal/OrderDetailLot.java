package dal;

import java.util.Objects;

/**
 *
 * @author koben
 */
public class OrderDetailLot {

    private String numeroLot;
    private String datePeremption;
    private int quantity;
    private int quantityGratuit;

    public String getNumeroLot() {
        return numeroLot;
    }

    public int getQuantityGratuit() {
        return quantityGratuit;
    }

    public void setQuantityGratuit(int quantityGratuit) {
        this.quantityGratuit = quantityGratuit;
    }

    public void setNumeroLot(String numeroLot) {
        this.numeroLot = numeroLot;
    }

    public String getDatePeremption() {
        return datePeremption;
    }

    public void setDatePeremption(String datePeremption) {
        this.datePeremption = datePeremption;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 97 * hash + Objects.hashCode(this.numeroLot);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final OrderDetailLot other = (OrderDetailLot) obj;
        return Objects.equals(this.numeroLot, other.numeroLot);
    }

    public OrderDetailLot(String numeroLot, String datePeremption, int quantity) {
        this.numeroLot = numeroLot;
        this.datePeremption = datePeremption;
        this.quantity = quantity;

    }

    public OrderDetailLot() {
    }

}
