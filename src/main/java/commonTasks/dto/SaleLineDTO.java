/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.time.Instant;

/**
 *
 * @author koben
 */
public class SaleLineDTO {

    private Integer quantitySold;
    private Integer regularUnitPrice;
    private Integer discountUnitPrice;
    private Integer netUnitPrice;
    private Integer discountAmount;
    private Integer salesAmount;
    private Integer grossAmount;
    private Integer netAmount;
    private Integer taxAmount;
    private Integer costAmount;
    private Instant createdAt;
    private Instant updatedAt;
    private String produitLibelle;
    private Integer quantiyAvoir;
    private Integer montantTvaUg = 0;
    private Integer quantityRequested;
    private Integer quantityUg;
    private Integer amountToBeTakenIntoAccount;
    private boolean toIgnore;
    private Instant effectiveUpdateDate;
    private Integer taxValue;
    private InventoryTransactionDTO snapshot;

    public Integer getTaxValue() {
        return taxValue;
    }

    public void setTaxValue(Integer taxValue) {
        this.taxValue = taxValue;
    }

    public Integer getQuantityUg() {
        return quantityUg;
    }

    public Integer getAmountToBeTakenIntoAccount() {
        return amountToBeTakenIntoAccount;
    }

    public void setAmountToBeTakenIntoAccount(Integer amountToBeTakenIntoAccount) {
        this.amountToBeTakenIntoAccount = amountToBeTakenIntoAccount;
    }

    public boolean isToIgnore() {
        return toIgnore;
    }

    public void setToIgnore(boolean toIgnore) {
        this.toIgnore = toIgnore;
    }

    public Instant getEffectiveUpdateDate() {
        return effectiveUpdateDate;
    }

    public void setEffectiveUpdateDate(Instant effectiveUpdateDate) {
        this.effectiveUpdateDate = effectiveUpdateDate;
    }

    public void setQuantityUg(Integer quantityUg) {
        this.quantityUg = quantityUg;
    }

    public Integer getQuantitySold() {
        return quantitySold;
    }

    public Integer getQuantiyAvoir() {
        return quantiyAvoir;
    }

    public Integer getQuantityRequested() {
        return quantityRequested;
    }

    public void setQuantityRequested(Integer quantityRequested) {
        this.quantityRequested = quantityRequested;
    }

    public void setQuantiyAvoir(Integer quantiyAvoir) {
        this.quantiyAvoir = quantiyAvoir;
    }

    public Integer getMontantTvaUg() {
        return montantTvaUg;
    }

    public void setMontantTvaUg(Integer montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
    }

    public void setQuantitySold(Integer quantitySold) {
        this.quantitySold = quantitySold;
    }

    public Integer getRegularUnitPrice() {
        return regularUnitPrice;
    }

    public void setRegularUnitPrice(Integer regularUnitPrice) {
        this.regularUnitPrice = regularUnitPrice;
    }

    public Integer getDiscountUnitPrice() {
        return discountUnitPrice;
    }

    public void setDiscountUnitPrice(Integer discountUnitPrice) {
        this.discountUnitPrice = discountUnitPrice;
    }

    public Integer getNetUnitPrice() {
        return netUnitPrice;
    }

    public void setNetUnitPrice(Integer netUnitPrice) {
        this.netUnitPrice = netUnitPrice;
    }

    public Integer getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(Integer discountAmount) {
        this.discountAmount = discountAmount;
    }

    public Integer getSalesAmount() {
        return salesAmount;
    }

    public void setSalesAmount(Integer salesAmount) {
        this.salesAmount = salesAmount;
    }

    public Integer getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(Integer grossAmount) {
        this.grossAmount = grossAmount;
    }

    public Integer getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(Integer netAmount) {
        this.netAmount = netAmount;
    }

    public Integer getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(Integer taxAmount) {
        this.taxAmount = taxAmount;
    }

    public Integer getCostAmount() {
        return costAmount;
    }

    public void setCostAmount(Integer costAmount) {
        this.costAmount = costAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getProduitLibelle() {
        return produitLibelle;
    }

    public void setProduitLibelle(String produitLibelle) {
        this.produitLibelle = produitLibelle;
    }

    public InventoryTransactionDTO getSnapshot() {
        return snapshot;
    }

    public void setSnapshot(InventoryTransactionDTO snapshot) {
        this.snapshot = snapshot;
    }

}
