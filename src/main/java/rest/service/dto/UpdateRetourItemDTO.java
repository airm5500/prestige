package rest.service.dto;

import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class UpdateRetourItemDTO {

    @NotNull
    private String retourtItemId;
    private int quantity;

    public String getRetourtItemId() {
        return retourtItemId;
    }

    public void setRetourtItemId(String retourtItemId) {
        this.retourtItemId = retourtItemId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

}
