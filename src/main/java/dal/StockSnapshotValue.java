/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Objects;

/**
 *
 * @author koben
 */
public class StockSnapshotValue implements Serializable {

    private static final long serialVersionUID = 1L;
    private int prixPaf;
    private int prixUni;
    private int qty;
    private int prixMoyentpondere;
    private int stockOfDay;

    public Integer getPrixPaf() {
        return prixPaf;
    }

    public StockSnapshotValue prixMoyentpondere(Integer prixMoyentpondere) {
        this.prixMoyentpondere = prixMoyentpondere;
        return this;
    }

    public StockSnapshotValue prixPaf(Integer prixPaf) {
        this.prixPaf = prixPaf;
        return this;
    }

    public void setPrixPaf(Integer prixPaf) {
        this.prixPaf = prixPaf;
    }

    public Integer getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(Integer prixUni) {
        this.prixUni = prixUni;
    }

    public StockSnapshotValue prixUni(Integer prixUni) {
        this.prixUni = prixUni;
        return this;
    }

    public Integer getQty() {
        return qty;
    }

    public StockSnapshotValue qty(Integer qty) {
        this.qty = qty;
        return this;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    public Integer getPrixMoyentpondere() {
        return prixMoyentpondere;
    }

    public void setPrixMoyentpondere(Integer prixMoyentpondere) {
        this.prixMoyentpondere = prixMoyentpondere;
    }

    public int getStockOfDay() {
        return stockOfDay;
    }

    public void setStockOfDay(int stockOfDay) {
        this.stockOfDay = stockOfDay;
    }

    public StockSnapshotValue stockOfDay(int stockOfDay) {
        this.stockOfDay = stockOfDay;
        return this;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 29 * hash + Objects.hashCode(this.stockOfDay);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final StockSnapshotValue other = (StockSnapshotValue) obj;
        if (!Objects.equals(this.stockOfDay, other.stockOfDay)) {
            return false;
        }
        return true;
    }

}
