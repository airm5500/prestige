package rest.service.dto;

/**
 * Ligne de l'ecran "Gestion des surstocks" (calculs corriges, ecran distinct de l'ancien "Articles en sur-stock").
 */
public class SurstockDTO {

    private String id;
    private String cip;
    private String libelle;
    private String codeGrossiste;
    private long qteVendue;
    private double moyenneMensuelle;
    private long prixVente;
    private long prixAchat;
    private long stock;
    private double coefficient;
    private double nbMoisStock;
    private long qteSurplus;
    private long valeurSurplus;

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

    public String getCodeGrossiste() {
        return codeGrossiste;
    }

    public void setCodeGrossiste(String codeGrossiste) {
        this.codeGrossiste = codeGrossiste;
    }

    public long getQteVendue() {
        return qteVendue;
    }

    public void setQteVendue(long qteVendue) {
        this.qteVendue = qteVendue;
    }

    public double getMoyenneMensuelle() {
        return moyenneMensuelle;
    }

    public void setMoyenneMensuelle(double moyenneMensuelle) {
        this.moyenneMensuelle = moyenneMensuelle;
    }

    public long getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(long prixVente) {
        this.prixVente = prixVente;
    }

    public long getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(long prixAchat) {
        this.prixAchat = prixAchat;
    }

    public long getStock() {
        return stock;
    }

    public void setStock(long stock) {
        this.stock = stock;
    }

    public double getCoefficient() {
        return coefficient;
    }

    public void setCoefficient(double coefficient) {
        this.coefficient = coefficient;
    }

    public double getNbMoisStock() {
        return nbMoisStock;
    }

    public void setNbMoisStock(double nbMoisStock) {
        this.nbMoisStock = nbMoisStock;
    }

    public long getQteSurplus() {
        return qteSurplus;
    }

    public void setQteSurplus(long qteSurplus) {
        this.qteSurplus = qteSurplus;
    }

    public long getValeurSurplus() {
        return valeurSurplus;
    }

    public void setValeurSurplus(long valeurSurplus) {
        this.valeurSurplus = valeurSurplus;
    }
}
