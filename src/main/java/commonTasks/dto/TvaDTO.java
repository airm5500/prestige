/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
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
    private Integer montantHt = 0, montantTva = 0, montantTtc = 0;
    private LocalDate localOperation;
     private String dateOperation;

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
    public Integer getMontantHt() {
        return montantHt;
    }

    public void setMontantHt(Integer montantHt) {
        this.montantHt = montantHt;
    }

    @JSONPropertyName("Total TVA")
    public Integer getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(Integer montantTva) {
        this.montantTva = montantTva;
    }

    @JSONPropertyName("Total TTC")
    public Integer getMontantTtc() {
        return montantTtc;
    }

    public void setMontantTtc(Integer montantTtc) {
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
        return "TvaDTO{" + "taux=" + taux + ", montantHt=" + montantHt + ", montantTva=" + montantTva + ", montantTtc=" + montantTtc + '}';
    }

}