
package rest.service.inventaire.dto;

/**
 *
 * @author koben
 */
public class RayonDTO {
    private final String id;
    private final String code;
    private final String libelle;

    public RayonDTO(String id, String code, String libelle) {
        this.id = id;
        this.code = code;
        this.libelle = libelle;
    }

    public String getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

}
