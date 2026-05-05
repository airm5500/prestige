/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TUser;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 *
 * @author Kobena
 */
public class SalesStatsParams implements Serializable {

    private int start = 0;
    private int limit = 20;
    private String typeVenteId;
    private TUser userId;
    private String query;
    private String statut;
    private LocalDate dtStart = LocalDate.now();
    private LocalDate dtEnd = dtStart;
    private LocalTime hStart = LocalTime.parse("00:00");
    private LocalTime hEnd = LocalTime.parse("23:59");
    private boolean showAll;
    private boolean showAllActivities;
    private boolean all;
    private boolean canCancel;
    private boolean depotOnly;
    private boolean sansBon;
    private boolean onlyAvoir;
    private boolean modification;
    private boolean modificationClientTp;
    private int nbre;
    private String produitId;
    private String prixachatFiltre;
    private String stockFiltre;
    private String typeFiltre;
    private String rayonId;
    private String user;
    private Integer qteVendu;
    private Integer stock;
    private boolean discountStat;
    private String tiersPayantId;
    private String nature;
    private boolean modificationVenteDate;
    private String depotId;
    private String typeDepotId;
    private String grossisteId;

    public String getDepotId() {
        return depotId;
    }

    public String getTypeDepotId() {
        return typeDepotId;
    }

    public void setTypeDepotId(String typeDepotId) {
        this.typeDepotId = typeDepotId;
    }

    public void setDepotId(String depotId) {
        this.depotId = depotId;
    }

    public String getNature() {
        return nature;
    }

    public void setNature(String nature) {
        this.nature = nature;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public boolean isDiscountStat() {
        return discountStat;
    }

    public void setDiscountStat(boolean discountStat) {
        this.discountStat = discountStat;
    }

    public String getTypeFiltre() {
        return typeFiltre;
    }

    public void setTypeFiltre(String typeFiltre) {
        this.typeFiltre = typeFiltre;
    }

    private String typeTransaction;

    public String getTypeTransaction() {
        return typeTransaction;
    }

    public void setTypeTransaction(String typeTransaction) {
        this.typeTransaction = typeTransaction;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public Integer getQteVendu() {
        return qteVendu;
    }

    public void setQteVendu(Integer qteVendu) {
        this.qteVendu = qteVendu;
    }

    public boolean isModificationClientTp() {
        return modificationClientTp;
    }

    public void setModificationClientTp(boolean modificationClientTp) {
        this.modificationClientTp = modificationClientTp;
    }

    public int getNbre() {
        return nbre;
    }

    public void setNbre(int nbre) {
        this.nbre = nbre;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getPrixachatFiltre() {
        return prixachatFiltre;
    }

    public void setPrixachatFiltre(String prixachatFiltre) {
        this.prixachatFiltre = prixachatFiltre;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getStockFiltre() {
        return stockFiltre;
    }

    public void setStockFiltre(String stockFiltre) {
        this.stockFiltre = stockFiltre;
    }

    public String getRayonId() {
        return rayonId;
    }

    public void setRayonId(String rayonId) {
        this.rayonId = rayonId;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public boolean isModificationVenteDate() {
        return modificationVenteDate;
    }

    public void setModificationVenteDate(boolean modificationVenteDate) {
        this.modificationVenteDate = modificationVenteDate;
    }

    public SalesStatsParams(boolean showAll, String typeVenteId, TUser userId, String query, String statut,
            LocalDate dtStart, LocalDate dtEnd, int start, int limit) {
        this.typeVenteId = typeVenteId;
        this.userId = userId;
        this.query = query;
        this.statut = statut;
        this.dtEnd = dtEnd;
        this.dtStart = dtStart;
        this.start = start;
        this.limit = limit;
        this.showAll = showAll;
    }

    public boolean isModification() {
        return modification;
    }

    public void setModification(boolean modification) {
        this.modification = modification;
    }

    public LocalTime gethStart() {
        return hStart;
    }

    public boolean isCanCancel() {
        return canCancel;
    }

    public void setCanCancel(boolean canCancel) {
        this.canCancel = canCancel;
    }

    public void sethStart(LocalTime hStart) {
        this.hStart = hStart;
    }

    public LocalTime gethEnd() {
        return hEnd;
    }

    public void sethEnd(LocalTime hEnd) {
        this.hEnd = hEnd;
    }

    public boolean isSansBon() {
        return sansBon;
    }

    public void setSansBon(boolean sansBon) {
        this.sansBon = sansBon;
    }

    public boolean isOnlyAvoir() {
        return onlyAvoir;
    }

    public void setOnlyAvoir(boolean onlyAvoir) {
        this.onlyAvoir = onlyAvoir;
    }

    public boolean isShowAllActivities() {
        return showAllActivities;
    }

    public SalesStatsParams() {
    }

    public boolean isAll() {
        return all;
    }

    public void setAll(boolean all) {
        this.all = all;
    }

    public void setShowAllActivities(boolean showAllActivities) {
        this.showAllActivities = showAllActivities;
    }

    public int getStart() {
        return start;
    }

    public void setStart(int start) {
        this.start = start;
    }

    public boolean isShowAll() {
        return showAll;
    }

    public void setShowAll(boolean showAll) {
        this.showAll = showAll;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

    public String getTypeVenteId() {
        return typeVenteId;
    }

    public void setTypeVenteId(String typeVenteId) {
        this.typeVenteId = typeVenteId;
    }

    public TUser getUserId() {
        return userId;
    }

    public void setUserId(TUser userId) {
        this.userId = userId;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDate getDtStart() {
        return dtStart;
    }

    public void setDtStart(LocalDate dtStart) {
        this.dtStart = dtStart;
    }

    public LocalDate getDtEnd() {
        return dtEnd;
    }

    public void setDtEnd(LocalDate dtEnd) {
        this.dtEnd = dtEnd;
    }

    public boolean isDepotOnly() {
        return depotOnly;
    }

    public void setDepotOnly(boolean depotOnly) {
        this.depotOnly = depotOnly;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("SalesStatsParams{typeVenteId=").append(typeVenteId);
        sb.append(", userId=").append(userId);
        sb.append(", query=").append(query);
        sb.append(", statut=").append(statut);
        sb.append(", dtStart=").append(dtStart);
        sb.append(", dtEnd=").append(dtEnd);
        sb.append(", hStart=").append(hStart);
        sb.append(", hEnd=").append(hEnd);
        sb.append(", showAll=").append(showAll);
        sb.append(", showAllActivities=").append(showAllActivities);
        sb.append(", all=").append(all);
        sb.append(", canCancel=").append(canCancel);
        sb.append(", nbre=").append(nbre);
        sb.append(", prixachatFiltre=").append(prixachatFiltre);
        sb.append(", stock=").append(stock);
        sb.append(", stockFiltre=").append(stockFiltre);
        sb.append(", rayonId=").append(rayonId);
        sb.append(", user=").append(user);
        sb.append(", typeTransaction=").append(typeTransaction);
        sb.append('}');
        return sb.toString();
    }

}
