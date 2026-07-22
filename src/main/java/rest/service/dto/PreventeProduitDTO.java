package rest.service.dto;

/**
 * Produit d'une vente en attente (impressions et creation d'inventaire depuis la liste des ventes en attente).
 */
public class PreventeProduitDTO {

    private String venteId;
    private String venteRef;
    private String dateVente;
    private String heure;
    private String vendeur;
    private String produitId;
    private String produitCip;
    private String produitLibelle;
    private Integer quantite;

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

    public String getDateVente() {
        return dateVente;
    }

    public void setDateVente(String dateVente) {
        this.dateVente = dateVente;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public String getVendeur() {
        return vendeur;
    }

    public void setVendeur(String vendeur) {
        this.vendeur = vendeur;
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
}
