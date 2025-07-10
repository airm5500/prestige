package rest.service.v2.dto;

import dal.enumeration.Canal;

/**
 *
 * @author koben
 */
public class ActiviteParam {

    private String dateActivite;
    private Canal canal;

    public String getDateActivite() {
        return dateActivite;
    }

    public Canal getCanal() {
        return canal;
    }

    public void setCanal(Canal canal) {
        this.canal = canal;
    }

    public void setDateActivite(String dateActivite) {
        this.dateActivite = dateActivite;
    }

    public ActiviteParam() {
    }

    public ActiviteParam(String dateActivite, Canal canal) {
        this.dateActivite = dateActivite;
        this.canal = canal;
    }

}
