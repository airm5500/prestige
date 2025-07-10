/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import util.Constant;

/**
 *
 * @author DICI
 */
@Entity
@Table(name = "rupture")
public class Rupture implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 40)
    private String id = UUID.randomUUID().toString();
    @Column(name = "dtCreated")
    private LocalDate dtCreated = LocalDate.now();
    @Column(name = "statut", length = 20)
    private String statut = Constant.STATUT_ENABLE;
    @Column(name = "dtUpdated")
    private LocalDate dtUpdated = LocalDate.now();
    @JoinColumn(name = "grossisteId", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste grossiste;
    @Column(name = "reference", length = 70, nullable = false)
    @NotNull
    private String reference;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDate getDtCreated() {
        return dtCreated;
    }

    public void setDtCreated(LocalDate dtCreated) {
        this.dtCreated = dtCreated;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDate getDtUpdated() {
        return dtUpdated;
    }

    public void setDtUpdated(LocalDate dtUpdated) {
        this.dtUpdated = dtUpdated;
    }

    public TGrossiste getGrossiste() {
        return grossiste;
    }

    public void setGrossiste(TGrossiste grossiste) {
        this.grossiste = grossiste;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    @Override
    public String toString() {
        return "Rupture{" + "id=" + id + ", dtCreated=" + dtCreated + ", statut=" + statut + ", dtUpdated=" + dtUpdated
                + ", grossiste=" + grossiste + '}';
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 23 * hash + Objects.hashCode(this.id);
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
        final Rupture other = (Rupture) obj;
        return Objects.equals(this.id, other.id);
    }

}
