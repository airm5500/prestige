package rest.service.dto;

/**
 * Ligne de l'ecran / du rapport "Suppressions de vente" (produits retires d'une vente, ventes abandonnees).
 */
public class VenteSuppressionDTO {

    private String id;
    private String typeSuppression;
    private String venteId;
    private String venteRef;
    private String produitId;
    private String produitCip;
    private String produitLibelle;
    private Integer quantite;
    private String userName;
    private String date;
    private String heure;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTypeSuppression() {
        return typeSuppression;
    }

    public void setTypeSuppression(String typeSuppression) {
        this.typeSuppression = typeSuppression;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getVenteRef() {
        return venteRef;
    }

    public void setVenteRef(String venteRef) {
        this.venteRef = venteRef;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getProduitCip() {
        return produitCip;
    }

    public void setProduitCip(String produitCip) {
        this.produitCip = produitCip;
    }

    public String getProduitLibelle() {
        return produitLibelle;
    }

    public void setProduitLibelle(String produitLibelle) {
        this.produitLibelle = produitLibelle;
    }

    public Integer getQuantite() {
        return quantite;
    }

    public void setQuantite(Integer quantite) {
        this.quantite = quantite;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
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
}
