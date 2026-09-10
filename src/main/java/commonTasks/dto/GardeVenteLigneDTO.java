package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

/** Une ligne de vente lue pendant une garde : le grain sur lequel toute l'analyse est construite. */
public class GardeVenteLigneDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String venteId = "";
    private String produitId = "";
    private String cip = "";
    private String libelle = "";
    private LocalDateTime dateOperation;
    private long quantite;
    private long montant;

    public GardeVenteLigneDTO() {
    }

    public GardeVenteLigneDTO(String venteId, String produitId, String cip, String libelle, LocalDateTime dateOperation,
            long quantite, long montant) {
        this.venteId = venteId;
        this.produitId = produitId;
        this.cip = cip;
        this.libelle = libelle;
        this.dateOperation = dateOperation;
        this.quantite = quantite;
        this.montant = montant;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
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

    public LocalDateTime getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDateTime dateOperation) {
        this.dateOperation = dateOperation;
    }

    public long getQuantite() {
        return quantite;
    }

    public void setQuantite(long quantite) {
        this.quantite = quantite;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }
}
