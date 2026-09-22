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
    /** Commande dans les N jours AVANT la garde : ce qu'on a prepare pour elle (21/09). */
    private long quantitePreparation;
    /** Stock disponible au moment de la lecture. */
    private long stock;
    /** Duree de la garde en jours, pour la frequence de vente par jour ; jamais moins de 1. */
    private double jours = 1D;

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

    public long getQuantitePreparation() {
        return quantitePreparation;
    }

    public void setQuantitePreparation(long quantitePreparation) {
        this.quantitePreparation = quantitePreparation;
    }

    public long getStock() {
        return stock;
    }

    public void setStock(long stock) {
        this.stock = stock;
    }

    public double getJours() {
        return jours;
    }

    public void setJours(double jours) {
        this.jours = jours > 0 ? jours : 1D;
    }

    /** Preparation et commande pendant la garde, ensemble. */
    public long getQuantiteTotale() {
        return quantitePreparation + quantiteCommandee;
    }

    /** Part vendue de ce qui a ete PREPARE avant la garde, en % ; 0 sans preparation ou sans vente. */
    public double getPourcentagePreparation() {
        return quantitePreparation > 0 && quantiteVendue > 0
                ? Math.round(quantiteVendue * 10000D / quantitePreparation) / 100D : 0D;
    }

    /** Part vendue de ce qui a ete COMMANDE pendant la garde, en % ; 0 sans commande ou sans vente. */
    public double getPourcentageCommande() {
        return quantiteCommandee > 0 && quantiteVendue > 0
                ? Math.round(quantiteVendue * 10000D / quantiteCommandee) / 100D : 0D;
    }

    /** Quantite vendue par jour de garde, a deux decimales. */
    public double getFrequenceJour() {
        return Math.round(quantiteVendue * 100D / jours) / 100D;
    }

    /** Commande (avant ou pendant) et pas une unite vendue pendant la garde. */
    public boolean isNonVendu() {
        return quantiteVendue <= 0;
    }
}
