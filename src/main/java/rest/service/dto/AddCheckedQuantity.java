package rest.service.dto;

import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class AddCheckedQuantity {

    @NotNull
    private String id;
    private boolean checked;
    private Integer checkedQuantity;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public boolean isChecked() {
        return checked;
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }

    public Integer getCheckedQuantity() {
        return checkedQuantity;
    }

    public void setCheckedQuantity(Integer checkedQuantity) {
        this.checkedQuantity = checkedQuantity;
    }

}
