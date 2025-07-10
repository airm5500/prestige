package rest.service.inventaire.dto;

/**
 *
 * @author koben
 */
public class InventaireDTO {

    private final String id;
    private final String libelle;

    public InventaireDTO(String id, String libelle) {
        this.id = id;
        this.libelle = libelle;
    }

    public String getId() {
        return id;
    }

    public String getLibelle() {
        return libelle;
    }

}
