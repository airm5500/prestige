package commonTasks.dto;

import java.io.Serializable;

/**
 * Infos complementaires d'un produit partagees par les APIs checkproduit et info : derniere vente, dernier achat,
 * dernier inventaire, code geo, classe ABC et stock reserve (avec ses seuils) si le produit est en reserve.
 */
public class ProduitExtraInfoDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String dateDerniereVente;
    private Integer qteDerniereVente;
    private String dateDernierAchat;
    private Integer qteDernierAchat;
    private String dateDernierInventaire;
    private Integer qteDernierInventaire;
    private String codeGeoArticle;
    private String classe;
    // Renseignes uniquement si le produit gere un stock reserve (bool_RESERVE)
    private Integer stockReserve;
    private Integer seuilReserve;
    private Integer seuilMiniRayon;

    public String getDateDerniereVente() {
        return dateDerniereVente;
    }

    public void setDateDerniereVente(String dateDerniereVente) {
        this.dateDerniereVente = dateDerniereVente;
    }

    public Integer getQteDerniereVente() {
        return qteDerniereVente;
    }

    public void setQteDerniereVente(Integer qteDerniereVente) {
        this.qteDerniereVente = qteDerniereVente;
    }

    public String getDateDernierAchat() {
        return dateDernierAchat;
    }

    public void setDateDernierAchat(String dateDernierAchat) {
        this.dateDernierAchat = dateDernierAchat;
    }

    public Integer getQteDernierAchat() {
        return qteDernierAchat;
    }

    public void setQteDernierAchat(Integer qteDernierAchat) {
        this.qteDernierAchat = qteDernierAchat;
    }

    public String getDateDernierInventaire() {
        return dateDernierInventaire;
    }

    public void setDateDernierInventaire(String dateDernierInventaire) {
        this.dateDernierInventaire = dateDernierInventaire;
    }

    public Integer getQteDernierInventaire() {
        return qteDernierInventaire;
    }

    public void setQteDernierInventaire(Integer qteDernierInventaire) {
        this.qteDernierInventaire = qteDernierInventaire;
    }

    public String getCodeGeoArticle() {
        return codeGeoArticle;
    }

    public void setCodeGeoArticle(String codeGeoArticle) {
        this.codeGeoArticle = codeGeoArticle;
    }

    public String getClasse() {
        return classe;
    }

    public void setClasse(String classe) {
        this.classe = classe;
    }

    public Integer getStockReserve() {
        return stockReserve;
    }

    public void setStockReserve(Integer stockReserve) {
        this.stockReserve = stockReserve;
    }

    public Integer getSeuilReserve() {
        return seuilReserve;
    }

    public void setSeuilReserve(Integer seuilReserve) {
        this.seuilReserve = seuilReserve;
    }

    public Integer getSeuilMiniRayon() {
        return seuilMiniRayon;
    }

    public void setSeuilMiniRayon(Integer seuilMiniRayon) {
        this.seuilMiniRayon = seuilMiniRayon;
    }
}
