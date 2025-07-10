
package rest.service.dto;

/**
 *
 * @author koben
 */
public class UpdateVenteParamDTO {
    private String venteId;
    private String date;
    private String heure;

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public UpdateVenteParamDTO() {
    }

}
