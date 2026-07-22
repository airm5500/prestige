package commonTasks.dto;

/**
 * Ligne de la feuille de match : donnees d'achat/vente d'un produit pour l'impression jasper (rp_feuille_de_match) et
 * le detail affiche sur la vue. Les indices M0..M3 designent le mois en cours (M0) et les trois mois precedents.
 */
public class FeuilleDeMatchLigneDTO {

    private String cip;
    private String libelle;
    private long prixAchat;
    private long prixVente;
    private String derniereEntree;
    private long freqM0;
    private long qteM0;
    private long freqM1;
    private long qteM1;
    private long freqM2;
    private long qteM2;
    private long freqM3;
    private long qteM3;
    private long stockReserve;
    private String venteHebdo;
    private String moyenneAchat3Mois;
    private String objectifStatut;

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

    public long getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(long prixAchat) {
        this.prixAchat = prixAchat;
    }

    public long getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(long prixVente) {
        this.prixVente = prixVente;
    }

    public String getDerniereEntree() {
        return derniereEntree;
    }

    public void setDerniereEntree(String derniereEntree) {
        this.derniereEntree = derniereEntree;
    }

    public long getFreqM0() {
        return freqM0;
    }

    public void setFreqM0(long freqM0) {
        this.freqM0 = freqM0;
    }

    public long getQteM0() {
        return qteM0;
    }

    public void setQteM0(long qteM0) {
        this.qteM0 = qteM0;
    }

    public long getFreqM1() {
        return freqM1;
    }

    public void setFreqM1(long freqM1) {
        this.freqM1 = freqM1;
    }

    public long getQteM1() {
        return qteM1;
    }

    public void setQteM1(long qteM1) {
        this.qteM1 = qteM1;
    }

    public long getFreqM2() {
        return freqM2;
    }

    public void setFreqM2(long freqM2) {
        this.freqM2 = freqM2;
    }

    public long getQteM2() {
        return qteM2;
    }

    public void setQteM2(long qteM2) {
        this.qteM2 = qteM2;
    }

    public long getFreqM3() {
        return freqM3;
    }

    public void setFreqM3(long freqM3) {
        this.freqM3 = freqM3;
    }

    public long getQteM3() {
        return qteM3;
    }

    public void setQteM3(long qteM3) {
        this.qteM3 = qteM3;
    }

    public long getStockReserve() {
        return stockReserve;
    }

    public void setStockReserve(long stockReserve) {
        this.stockReserve = stockReserve;
    }

    public String getVenteHebdo() {
        return venteHebdo;
    }

    public void setVenteHebdo(String venteHebdo) {
        this.venteHebdo = venteHebdo;
    }

    public String getMoyenneAchat3Mois() {
        return moyenneAchat3Mois;
    }

    public void setMoyenneAchat3Mois(String moyenneAchat3Mois) {
        this.moyenneAchat3Mois = moyenneAchat3Mois;
    }

    public String getObjectifStatut() {
        return objectifStatut;
    }

    public void setObjectifStatut(String objectifStatut) {
        this.objectifStatut = objectifStatut;
    }
}
