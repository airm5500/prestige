/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 *
 * @author Kobena
 */
public class CaisseParamsDTO implements Serializable {

    private LocalDate startDate = LocalDate.now();
    private LocalDate end = LocalDate.now();
    private LocalTime startHour;
    private LocalTime startEnd;
    private String typeReglementId;
    private String utilisateurId;
    private int start;
    private int limit;
    private int page;
    private String emplacementId;
    private boolean findClient;
    private boolean all;

    public LocalDate getStartDate() {
        return startDate;
    }

    public int getPage() {
        return page;
    }

    public boolean isFindClient() {
        return findClient;
    }

    public void setFindClient(boolean findClient) {
        this.findClient = findClient;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public String getEmplacementId() {
        return emplacementId;
    }

    public void setEmplacementId(String emplacementId) {
        this.emplacementId = emplacementId;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
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

    public LocalDate getEnd() {
        return end;
    }

    public void setEnd(LocalDate end) {
        this.end = end;
    }

    public LocalTime getStartHour() {
        return startHour;
    }

    public void setStartHour(LocalTime startHour) {
        this.startHour = startHour;
    }

    public LocalTime getStartEnd() {
        return startEnd;
    }

    public void setStartEnd(LocalTime startEnd) {
        this.startEnd = startEnd;
    }

    public String getTypeReglementId() {
        return typeReglementId;
    }

    public void setTypeReglementId(String typeReglementId) {
        this.typeReglementId = typeReglementId;
    }

    public String getUtilisateurId() {
        return utilisateurId;
    }

    public void setUtilisateurId(String utilisateurId) {
        this.utilisateurId = utilisateurId;
    }

    public boolean isAll() {
        return all;
    }

    public void setAll(boolean all) {
        this.all = all;
    }

    @Override
    public String toString() {
        return "CaisseParamsDTO{" + "startDate=" + startDate + ", end=" + end + ", startHour=" + startHour
                + ", startEnd=" + startEnd + ", typeReglementId=" + typeReglementId + ", utilisateurId=" + utilisateurId
                + ", start=" + start + ", limit=" + limit + ", page=" + page + ", emplacementId=" + emplacementId + '}';
    }

}
