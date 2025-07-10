package rest.service.dto;

/**
 *
 * @author koben
 */
public class BillatageItemDTO {

    private int quantity;
    private int power;

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getPower() {
        return power;
    }

    public void setPower(int power) {
        this.power = power;
    }

    public BillatageItemDTO() {
    }

}
