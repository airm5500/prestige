/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;

/**
 *
 * @author DICI
 */
public class AchatDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private long montantTTC = 0;
    private long montantHT = 0;
    private long montantTVA = 0;
    private String libelleGroupeGrossiste;

    public long getMontantTTC() {
        return montantTTC;
    }

    public void setMontantTTC(long montantTTC) {
        this.montantTTC = montantTTC;
    }

    public long getMontantHT() {
        return montantHT;
    }

    public void setMontantHT(long montantHT) {
        this.montantHT = montantHT;
    }

    public long getMontantTVA() {
        return montantTVA;
    }

    public void setMontantTVA(long montantTVA) {
        this.montantTVA = montantTVA;
    }

    public String getLibelleGroupeGrossiste() {
        return libelleGroupeGrossiste;
    }

    public void setLibelleGroupeGrossiste(String libelleGroupeGrossiste) {
        this.libelleGroupeGrossiste = libelleGroupeGrossiste;
    }

    @Override
    public String toString() {
        return "AchatDTO{" + "montantTTC=" + montantTTC + ", montantHT=" + montantHT + ", montantTVA=" + montantTVA
                + ", libelleGroupeGrossiste=" + libelleGroupeGrossiste + '}';
    }

}
