/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.dto;

import dal.RetourCarnetDetail;
import dal.TFamille;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 *
 * @author koben
 */
public class RetourCarnetDetailDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;

    private String motifRetourCarnet;

    private String produitCip;
    private String produitLib;
    private Integer retourCarnetId;
    private String dateOperation;
    private LocalDateTime createdAt;

    private Integer stockInit;

    private Integer stockFinal;

    private Integer qtyRetour, prixUni, amount;

    public Integer getPrixUni() {
        return prixUni;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public void setPrixUni(Integer prixUni) {
        this.prixUni = prixUni;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getStockInit() {
        return stockInit;
    }

    public void setStockInit(Integer stockInit) {
        this.stockInit = stockInit;
    }

    public Integer getStockFinal() {
        return stockFinal;
    }

    public void setStockFinal(Integer stockFinal) {
        this.stockFinal = stockFinal;
    }

    public Integer getQtyRetour() {
        return qtyRetour;
    }

    public void setQtyRetour(Integer qtyRetour) {
        this.qtyRetour = qtyRetour;
    }

    public String getMotifRetourCarnet() {
        return motifRetourCarnet;
    }

    public void setMotifRetourCarnet(String motifRetourCarnet) {
        this.motifRetourCarnet = motifRetourCarnet;
    }

    public String getProduitCip() {
        return produitCip;
    }

    public void setProduitCip(String produitCip) {
        this.produitCip = produitCip;
    }

    public String getProduitLib() {
        return produitLib;
    }

    public void setProduitLib(String produitLib) {
        this.produitLib = produitLib;
    }

    public Integer getRetourCarnetId() {
        return retourCarnetId;
    }

    public void setRetourCarnetId(Integer retourCarnetId) {
        this.retourCarnetId = retourCarnetId;
    }

    public String getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(String dateOperation) {
        this.dateOperation = dateOperation;
    }

    public RetourCarnetDetailDTO() {
    }

    public RetourCarnetDetailDTO(RetourCarnetDetail detail) {
        this.id = detail.getId();
        this.motifRetourCarnet = detail.getMotifRetourCarnet().getLibelle();
        TFamille produit = detail.getProduit();
        this.produitCip = produit.getIntCIP();
        this.produitLib = produit.getStrNAME();
        this.retourCarnetId = detail.getRetourCarnet().getId();
        this.dateOperation = detail.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        this.createdAt = detail.getCreatedAt();
        this.stockInit = detail.getStockInit();
        this.stockFinal = detail.getStockFinal();
        this.qtyRetour = detail.getQtyRetour();
        this.prixUni = detail.getPrixUni();
        this.amount = detail.getPrixUni() * detail.getQtyRetour();
    }

    @Override
    public String toString() {
        return "RetourCarnetDetailDTO{" + "id=" + id + ", motifRetourCarnet=" + motifRetourCarnet + ", produitCip="
                + produitCip + ", produitLib=" + produitLib + ", retourCarnetId=" + retourCarnetId + ", dateOperation="
                + dateOperation + ", createdAt=" + createdAt + ", stockInit=" + stockInit + ", stockFinal=" + stockFinal
                + ", qtyRetour=" + qtyRetour + ", prixUni=" + prixUni + '}';
    }

    public RetourCarnetDetailDTO(Long qtyRetour, Long montant) {
        this.qtyRetour = qtyRetour.intValue();
        this.prixUni = montant.intValue();
    }

}
