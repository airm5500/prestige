/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDate;

/**
 *
 * @author DICI
 */
public class MvtArticleParams implements Serializable {
    private static final long serialVersionUID = 1L;
    private LocalDate dtStart = LocalDate.now(), dtEnd = dtStart;
    private String search, categorieId, fabricantId, rayonId, magasinId, produitId;
    private int start = 0, limit = 30;
    private boolean all = false;

    public LocalDate getDtStart() {
        return dtStart;
    }

    public void setDtStart(LocalDate dtStart) {
        this.dtStart = dtStart;
    }

    public LocalDate getDtEnd() {
        return dtEnd;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public void setDtEnd(LocalDate dtEnd) {
        this.dtEnd = dtEnd;
    }

    public String getSearch() {
        return search;
    }

    public void setSearch(String search) {
        this.search = search;
    }

    public String getCategorieId() {
        return categorieId;
    }

    public void setCategorieId(String categorieId) {
        this.categorieId = categorieId;
    }

    public String getFabricantId() {
        return fabricantId;
    }

    public void setFabricantId(String fabricantId) {
        this.fabricantId = fabricantId;
    }

    public String getRayonId() {
        return rayonId;
    }

    public void setRayonId(String rayonId) {
        this.rayonId = rayonId;
    }

    public String getMagasinId() {
        return magasinId;
    }

    public void setMagasinId(String magasinId) {
        this.magasinId = magasinId;
    }

    @Override
    public String toString() {
        return "MvtArticleParams{" + "dtStart=" + dtStart + ", dtEnd=" + dtEnd + ", search=" + search + ", categorieId="
                + categorieId + ", fabricantId=" + fabricantId + ", rayonId=" + rayonId + ", magasinId=" + magasinId
                + '}';
    }

    public MvtArticleParams() {
    }

    public int getStart() {
        return start;
    }

    public void setStart(int start) {
        this.start = start;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

    public boolean isAll() {
        return all;
    }

    public void setAll(boolean all) {
        this.all = all;
    }

}
