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
    /*
     * Retour du 08/09 (gardes, H1) : ce qu'il faut pour la MARGE, avec la formule de l'analyse ABC de l'application :
     * (montant - remise - tva) - prix d'achat unitaire x quantite.
     */
    private long remise;
    private long tva;
    private long prixAchat;
    /** Client rattache a la vente (H2) ; vide pour une vente anonyme. */
    private String clientId = "";
    /** Vendeur de la vente (H3). */
    private String vendeurId = "";
    private String vendeurNom = "";
    /* Retour des tests du 09/09 : la famille, le rayon (emplacement) et le grossiste du produit, pour filtrer. */
    private String familleId = "";
    private String rayonId = "";
    private String grossisteId = "";

    public String getVendeurId() {
        return vendeurId;
    }

    public String getVendeurNom() {
        return vendeurNom;
    }

    public void setVendeur(String vendeurId, String vendeurNom) {
        this.vendeurId = vendeurId == null ? "" : vendeurId;
        this.vendeurNom = vendeurNom == null ? "" : vendeurNom;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId == null ? "" : clientId;
    }

    /**
     * La cle qui compte un client : le client rattache, ou la vente elle-meme quand elle est anonyme -- une vente
     * anonyme, c'est un client venu au comptoir.
     */
    public String getCleClient() {
        return clientId.isEmpty() ? "vente:" + venteId : "client:" + clientId;
    }

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

    public GardeVenteLigneDTO(String venteId, String produitId, String cip, String libelle, LocalDateTime dateOperation,
            long quantite, long montant, long remise, long tva, long prixAchat) {
        this(venteId, produitId, cip, libelle, dateOperation, quantite, montant);
        this.remise = remise;
        this.tva = tva;
        this.prixAchat = prixAchat;
    }

    public long getRemise() {
        return remise;
    }

    public long getTva() {
        return tva;
    }

    public long getPrixAchat() {
        return prixAchat;
    }

    public String getFamilleId() {
        return familleId;
    }

    public String getRayonId() {
        return rayonId;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setRattachements(String familleId, String rayonId, String grossisteId) {
        this.familleId = familleId == null ? "" : familleId;
        this.rayonId = rayonId == null ? "" : rayonId;
        this.grossisteId = grossisteId == null ? "" : grossisteId;
    }

    /** Marge de la ligne, formule de l'analyse ABC de l'application. */
    public long getMarge() {
        return (montant - remise - tva) - prixAchat * quantite;
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
