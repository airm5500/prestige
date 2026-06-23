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
    // Config reappro/suggestion de la fiche (Phase A)
    private Boolean boolCalculSeuil;
    private Boolean boolSuggerable;
    private Boolean boolRemise;
    private Integer q1SeuilReappro;
    private Integer q2QteReappro;

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

    public Boolean getBoolCalculSeuil() {
        return boolCalculSeuil;
    }

    public void setBoolCalculSeuil(Boolean boolCalculSeuil) {
        this.boolCalculSeuil = boolCalculSeuil;
    }

    public Boolean getBoolSuggerable() {
        return boolSuggerable;
    }

    public void setBoolSuggerable(Boolean boolSuggerable) {
        this.boolSuggerable = boolSuggerable;
    }

    public Boolean getBoolRemise() {
        return boolRemise;
    }

    public void setBoolRemise(Boolean boolRemise) {
        this.boolRemise = boolRemise;
    }

    public Integer getQ1SeuilReappro() {
        return q1SeuilReappro;
    }

    public void setQ1SeuilReappro(Integer q1SeuilReappro) {
        this.q1SeuilReappro = q1SeuilReappro;
    }

    public Integer getQ2QteReappro() {
        return q2QteReappro;
    }

    public void setQ2QteReappro(Integer q2QteReappro) {
        this.q2QteReappro = q2QteReappro;
    }

}
