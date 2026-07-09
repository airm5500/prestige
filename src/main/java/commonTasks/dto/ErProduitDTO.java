
package commonTasks.dto;

import dal.TFamille;
import dal.TFamilleStock;

import java.io.Serializable;

/**
 *
 * @author Hermann N'ZI
 */
public class ErProduitDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String familleId;
    private String familleCip;
    private String familleLibelle;
    private Integer pachat;
    private Integer pvente;
    private Integer stock;
    private String emplacement;
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

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public String getFamilleCip() {
        return familleCip;
    }

    public void setFamilleCip(String familleCip) {
        this.familleCip = familleCip;
    }

    public String getFamilleLibelle() {
        return familleLibelle;
    }

    public void setFamilleLibelle(String familleLibelle) {
        this.familleLibelle = familleLibelle;
    }

    public Integer getPachat() {
        return pachat;
    }

    public void setPachat(Integer pachat) {
        this.pachat = pachat;
    }

    public Integer getPvente() {
        return pvente;
    }

    public void setPvente(Integer pvente) {
        this.pvente = pvente;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(String emplacement) {
        this.emplacement = emplacement;
    }

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

    public ErProduitDTO(TFamilleStock fs) {

        TFamille f = fs.getLgFAMILLEID();

        this.familleId = f.getLgFAMILLEID();
        this.familleCip = f.getIntCIP();
        this.familleLibelle = f.getStrNAME();
        this.pachat = f.getIntPAF();
        this.pvente = f.getIntPRICE();
        this.stock = fs.getIntNUMBER();
        this.emplacement = f.getLgZONEGEOID().getStrLIBELLEE();
        this.codeGeoArticle = f.getStrCODEGEOARTICLE();

    }

    public ErProduitDTO() {
    }

}
