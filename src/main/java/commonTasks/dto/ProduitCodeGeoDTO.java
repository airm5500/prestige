package commonTasks.dto;

/** Une ligne de l'ecran « Produits par code géo » (plan d'octobre, section 6). */
public class ProduitCodeGeoDTO {

    private String id, cip, libelle, emplacement, codeGeo, codeGeoReserve;
    private Integer stockRayon, stockReserve, colisage;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(String emplacement) {
        this.emplacement = emplacement;
    }

    public String getCodeGeo() {
        return codeGeo;
    }

    public void setCodeGeo(String codeGeo) {
        this.codeGeo = codeGeo;
    }

    public String getCodeGeoReserve() {
        return codeGeoReserve;
    }

    public void setCodeGeoReserve(String codeGeoReserve) {
        this.codeGeoReserve = codeGeoReserve;
    }

    public Integer getStockRayon() {
        return stockRayon;
    }

    public void setStockRayon(Integer stockRayon) {
        this.stockRayon = stockRayon;
    }

    public Integer getStockReserve() {
        return stockReserve;
    }

    public void setStockReserve(Integer stockReserve) {
        this.stockReserve = stockReserve;
    }

    public Integer getColisage() {
        return colisage;
    }

    public void setColisage(Integer colisage) {
        this.colisage = colisage;
    }
}
