package commonTasks.dto;

import java.io.Serializable;

/** Un produit commande pendant la garde (H3), et ce qui s'en est vendu pendant la meme garde. */
public class GardeCommandeDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String produitId = "";
    private String cip = "";
    private String libelle = "";
    private long quantiteCommandee;
    private long quantiteVendue;

    public GardeCommandeDTO() {
    }

    public GardeCommandeDTO(String produitId, String cip, String libelle, long quantiteCommandee) {
        this.produitId = produitId == null ? "" : produitId;
        this.cip = cip == null ? "" : cip;
        this.libelle = libelle == null ? "" : libelle;
        this.quantiteCommandee = quantiteCommandee;
    }

    public String getProduitId() {
        return produitId;
    }

    public String getCip() {
        return cip;
    }

    public String getLibelle() {
        return libelle;
    }

    public long getQuantiteCommandee() {
        return quantiteCommandee;
    }

    public void setQuantiteCommandee(long quantiteCommandee) {
        this.quantiteCommandee = quantiteCommandee;
    }

    public long getQuantiteVendue() {
        return quantiteVendue;
    }

    public void setQuantiteVendue(long quantiteVendue) {
        this.quantiteVendue = quantiteVendue;
    }

    /** Commande pendant la garde et pas une unite vendue pendant la meme garde. */
    public boolean isNonVendu() {
        return quantiteVendue <= 0;
    }
}
