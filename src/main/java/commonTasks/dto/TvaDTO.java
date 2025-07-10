/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import org.json.JSONPropertyName;

/**
 *
 * @author DICI
 */
public class TvaDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private Integer taux = 0;
    private long montantHt = 0;
    private long montantTva = 0;
    private long montantTtc = 0;
    private long montantUg;
    private LocalDate localOperation;
    private String dateOperation;

    public long getMontantUg() {
        return montantUg;
    }

    public void setMontantUg(long montantUg) {
        this.montantUg = montantUg;
    }

    @JSONPropertyName("TAUX")
    public Integer getTaux() {
        return taux;
    }

    public void setTaux(Integer taux) {
        this.taux = taux;
    }

    public LocalDate getLocalOperation() {
        return localOperation;
    }

    public void setLocalOperation(LocalDate localOperation) {
        this.localOperation = localOperation;
    }

    public String getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(String dateOperation) {
        this.dateOperation = dateOperation;
    }

    @JSONPropertyName("Total HT")
    public long getMontantHt() {
        return montantHt;
    }

    public void setMontantHt(long montantHt) {
        this.montantHt = montantHt;
    }

    @JSONPropertyName("Total TVA")
    public long getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(long montantTva) {
        this.montantTva = montantTva;
    }

    @JSONPropertyName("Total TTC")
    public long getMontantTtc() {
        return montantTtc;
    }

    public void setMontantTtc(long montantTtc) {
        this.montantTtc = montantTtc;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 29 * hash + Objects.hashCode(this.taux);
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
        final TvaDTO other = (TvaDTO) obj;
        return Objects.equals(this.taux, other.taux);
    }

    @Override
    public String toString() {
        return "TvaDTO{" + "taux=" + taux + ", montantHt=" + montantHt + ", montantTva=" + montantTva + ", montantTtc="
                + montantTtc + '}';
    }

    public TvaDTO() {
    }

    public TvaDTO(Integer taux, long montantHt, long montantTva, long montantTtc) {
        this.taux = taux;
        this.montantHt = montantHt;
        this.montantTtc = montantTtc;
        this.montantTva = montantTva;
    }

    public TvaDTO(Integer taux, double montantHt, double montantTtc) {
        this.taux = taux;
        this.montantHt = (long) Math.ceil(montantHt);
        this.montantTtc = (long) Math.ceil(montantTtc);
        this.montantTva = this.montantTtc - this.montantHt;
    }

    public TvaDTO(long montantTTC) {
        this.montantTtc = montantTTC;

    }

    public TvaDTO(Integer taux, long montantTtc) {
        this.taux = taux;
        this.montantTtc = montantTtc;
    }

    public TvaDTO(Integer taux, long montantTtc, LocalDate date) {
        this.taux = taux;
        this.montantTtc = montantTtc;
        this.localOperation = date;
    }

    public TvaDTO(Integer taux, BigDecimal montantTtc) {
        this.taux = taux;
        this.montantTtc = montantTtc.longValue();
    }

}
