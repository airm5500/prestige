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

    private int start = 0, limit = 20;
    private String typeVenteId;
    private TUser userId;
    private String query, statut;
    private LocalDate dtStart = LocalDate.now(), dtEnd = dtStart;
     private LocalTime hStart = LocalTime.parse("00:00"), hEnd = LocalTime.parse("23:59");
    private boolean showAll,showAllActivities,all,canCancel;
    private boolean depotOnly=false,sansBon=false,onlyAvoir=false,modification; 

    public SalesStatsParams(boolean showAll,String typeVenteId, TUser userId, String query, String statut, LocalDate dtStart, LocalDate dtEnd, int start, int limit) {
        this.typeVenteId = typeVenteId;
        this.userId = userId;
        this.query = query;
        this.statut = statut;
        this.dtEnd=dtEnd;
        this.dtStart=dtStart;
        this.start=start;
        this.limit=limit;
        this.showAll=showAll;
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

}