/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Date;

/**
 *
 * @author Kobena
 */
public class QueryDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String query, emplacementId, venteId;
    private int start = 0, limit;
    private String dtStart, dtEnd, statut;
    private Date utilDateStart, utilDateEnd;
    private LocalDate localDateStart, localDateEnd;

    public String getQuery() {
        return query;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getEmplacementId() {
        return emplacementId;
    }

    public void setEmplacementId(String emplacementId) {
        this.emplacementId = emplacementId;
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

    public String getDtStart() {
        return dtStart;
    }

    public void setDtStart(String dtStart) {
        this.dtStart = dtStart;
    }

    public String getDtEnd() {
        return dtEnd;
    }

    public void setDtEnd(String dtEnd) {
        this.dtEnd = dtEnd;
    }

    public Date getUtilDateStart() {
        return utilDateStart;
    }

    public void setUtilDateStart(Date utilDateStart) {
        this.utilDateStart = utilDateStart;
    }

    public Date getUtilDateEnd() {
        return utilDateEnd;
    }

    public void setUtilDateEnd(Date utilDateEnd) {
        this.utilDateEnd = utilDateEnd;
    }

    public LocalDate getLocalDateStart() {
        return localDateStart;
    }

    public void setLocalDateStart(LocalDate localDateStart) {
        this.localDateStart = localDateStart;
    }

    public LocalDate getLocalDateEnd() {
        return localDateEnd;
    }

    public void setLocalDateEnd(LocalDate localDateEnd) {
        this.localDateEnd = localDateEnd;
    }

    @Override
    public String toString() {
        return "QueryDTO{" + "query=" + query + ", start=" + start + ", limit=" + limit + ", dtStart=" + dtStart
                + ", dtEnd=" + dtEnd + ", utilDateStart=" + utilDateStart + ", utilDateEnd=" + utilDateEnd
                + ", localDateStart=" + localDateStart + ", localDateEnd=" + localDateEnd + '}';
    }

}
