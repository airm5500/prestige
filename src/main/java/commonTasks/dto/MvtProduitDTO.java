/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author DICI
 */
public class MvtProduitDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private final DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    String produitId, cip, produitName, dateOp;
    LocalDate dateOperation;
    int qtyVente = 0, qtyAnnulation = 0, qtyRetour = 0, qtyRetourDepot = 0, qtyInv = 0;
    int stockInit = 0, stockFinal = 0, currentStock = 0, qtyPerime = 0, qtyAjust = 0;
    int qtyAjustSortie = 0, qtyDeconEntrant = 0, qtyDecondSortant = 0, qtyEntree = 0;
    private String typeMvtId, categorieMvt;
    private int qtyMvt = 0, ecartInventaire = 0;

    private List<MvtProduitDTO> produits = new ArrayList<>();

    public String getProduitId() {
        return produitId;
    }

    public int getEcartInventaire() {
        return ecartInventaire;
    }

    public void setEcartInventaire(int ecartInventaire) {
        this.ecartInventaire = ecartInventaire;
    }

    public List<MvtProduitDTO> getProduits() {
        return produits;
    }

    public void setProduits(List<MvtProduitDTO> produits) {
        this.produits = produits;
    }

    public String getTypeMvtId() {
        return typeMvtId;
    }

    public void setTypeMvtId(String typeMvtId) {
        this.typeMvtId = typeMvtId;
    }

    public String getCategorieMvt() {
        return categorieMvt;
    }

    public void setCategorieMvt(String categorieMvt) {
        this.categorieMvt = categorieMvt;
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

    public String getProduitName() {
        return produitName;
    }

    public void setProduitName(String produitName) {
        this.produitName = produitName;
    }

    public String getDateOp() {
        return dateOp;
    }

    public void setDateOp(String dateOp) {
        this.dateOp = dateOp;
    }

    public LocalDate getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDate dateOperation) {
        this.dateOp = dateOperation.format(dateFormat);
        this.dateOperation = dateOperation;
    }

    public int getQtyVente() {
        return qtyVente;
    }

    public void setQtyVente(int qtyVente) {
        this.qtyVente = qtyVente;
    }

    public int getQtyAnnulation() {
        return qtyAnnulation;
    }

    public void setQtyAnnulation(int qtyAnnulation) {
        this.qtyAnnulation = qtyAnnulation;
    }

    public int getQtyRetour() {
        return qtyRetour;
    }

    public void setQtyRetour(int qtyRetour) {
        this.qtyRetour = qtyRetour;
    }

    public int getQtyRetourDepot() {
        return qtyRetourDepot;
    }

    public void setQtyRetourDepot(int qtyRetourDepot) {
        this.qtyRetourDepot = qtyRetourDepot;
    }

    public int getQtyInv() {
        return qtyInv;
    }

    public void setQtyInv(int qtyInv) {
        this.qtyInv = qtyInv;
    }

    public int getStockInit() {
        return stockInit;
    }

    public void setStockInit(int stockInit) {
        this.stockInit = stockInit;
    }

    public int getStockFinal() {
        return stockFinal;
    }

    public void setStockFinal(int stockFinal) {
        this.stockFinal = stockFinal;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(int currentStock) {
        this.currentStock = currentStock;
    }

    public int getQtyPerime() {
        return qtyPerime;
    }

    public void setQtyPerime(int qtyPerime) {
        this.qtyPerime = qtyPerime;
    }

    public int getQtyAjust() {
        return qtyAjust;
    }

    public void setQtyAjust(int qtyAjust) {
        this.qtyAjust = qtyAjust;
    }

    public int getQtyAjustSortie() {
        return qtyAjustSortie;
    }

    public void setQtyAjustSortie(int qtyAjustSortie) {
        this.qtyAjustSortie = qtyAjustSortie;
    }

    public int getQtyDeconEntrant() {
        return qtyDeconEntrant;
    }

    public void setQtyDeconEntrant(int qtyDeconEntrant) {
        this.qtyDeconEntrant = qtyDeconEntrant;
    }

    public int getQtyDecondSortant() {
        return qtyDecondSortant;
    }

    public void setQtyDecondSortant(int qtyDecondSortant) {
        this.qtyDecondSortant = qtyDecondSortant;
    }

    public int getQtyEntree() {
        return qtyEntree;
    }

    public void setQtyEntree(int qtyEntree) {
        this.qtyEntree = qtyEntree;
    }

    @Override
    public String toString() {
        return "MvtProduitDTO{" + "produitId=" + produitId + ", cip=" + cip + ", produitName=" + produitName + '}';
    }

    public MvtProduitDTO() {
    }

    public int getQtyMvt() {
        return qtyMvt;
    }

    public void setQtyMvt(int qtyMvt) {
        this.qtyMvt = qtyMvt;
    }

    public MvtProduitDTO(String produitId, String cip, String produitName, String typeMvtId, int qty) {
        this.produitId = produitId;
        this.cip = cip;
        this.produitName = produitName;
        this.typeMvtId = typeMvtId;
        this.qtyMvt = qty;
    }

    public MvtProduitDTO(MvtProduitDTO mvtProduit, int currentStock) {
        this.produitId = mvtProduit.getProduitId();
        this.cip = mvtProduit.getCip();
        this.produitName = mvtProduit.getProduitName();
        this.typeMvtId = mvtProduit.getTypeMvtId();
        this.qtyMvt = mvtProduit.getQtyMvt();
        this.currentStock = currentStock;
    }

    public MvtProduitDTO(Integer qty) {
        this.stockInit = qty;
    }
}
