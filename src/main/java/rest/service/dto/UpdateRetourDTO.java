
package rest.service.dto;

import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class UpdateRetourDTO {
    @NotNull
    private String retourId;
    private String comment;

    public String getRetourId() {
        return retourId;
    }

    public void setRetourId(String retourId) {
        this.retourId = retourId;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

}
