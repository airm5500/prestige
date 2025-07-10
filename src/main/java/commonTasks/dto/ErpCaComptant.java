/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;

/**
 *
 * @author koben
 */
public class ErpCaComptant implements Serializable {
    private static final long serialVersionUID = 1L;
    private long totEsp, totCB, totVirement, totTVA, totMobile;
    private long totChq, remiseSurCA;
    private String mvtDate, mode;
    private long montantCredit;

    public long getTotEsp() {
        return totEsp;
    }

    public void setTotEsp(long totEsp) {
        this.totEsp = totEsp;
    }

    public long getTotCB() {
        return totCB;
    }

    public void setTotCB(long totCB) {
        this.totCB = totCB;
    }

    public long getTotVirement() {
        return totVirement;
    }

    public void setTotVirement(long totVirement) {
        this.totVirement = totVirement;
    }

    public long getTotTVA() {
        return totTVA;
    }

    public void setTotTVA(long totTVA) {
        this.totTVA = totTVA;
    }

    public long getTotMobile() {
        return totMobile;
    }

    public void setTotMobile(long totMobile) {
        this.totMobile = totMobile;
    }

    public long getTotChq() {
        return totChq;
    }

    public void setTotChq(long totChq) {
        this.totChq = totChq;
    }

    public long getRemiseSurCA() {
        return remiseSurCA;
    }

    public void setRemiseSurCA(long remiseSurCA) {
        this.remiseSurCA = remiseSurCA;
    }

    public String getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(String mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public long getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(long montantCredit) {
        this.montantCredit = montantCredit;
    }

}
