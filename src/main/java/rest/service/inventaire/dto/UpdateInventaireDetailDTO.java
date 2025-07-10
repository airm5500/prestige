package rest.service.inventaire.dto;

/**
 *
 * @author koben
 */
public class UpdateInventaireDetailDTO {

    private Long id;
    private Integer quantite;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getQuantite() {
        return quantite;
    }

    public void setQuantite(Integer quantite) {
        this.quantite = quantite;
    }

}
