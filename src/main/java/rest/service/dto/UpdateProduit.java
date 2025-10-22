package rest.service.dto;

/**
 *
 * @author koben
 */
public class UpdateProduit {

    private String id;
    private String codeEanFabriquant;
    private String rayonId;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCodeEanFabriquant() {
        return codeEanFabriquant;
    }

    public void setCodeEanFabriquant(String codeEanFabriquant) {
        this.codeEanFabriquant = codeEanFabriquant;
    }

    public String getRayonId() {
        return rayonId;
    }

    public void setRayonId(String rayonId) {
        this.rayonId = rayonId;
    }

}
