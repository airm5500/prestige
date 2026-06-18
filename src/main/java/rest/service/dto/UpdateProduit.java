package rest.service.dto;

/**
 *
 * @author koben
 */
public class UpdateProduit {

    private String id;
    private String codeEanFabriquant;
    private String rayonId;
    private String codeGeoArticle;

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

    public String getCodeGeoArticle() {
        return codeGeoArticle;
    }

    public void setCodeGeoArticle(String codeGeoArticle) {
        this.codeGeoArticle = codeGeoArticle;
    }

}
