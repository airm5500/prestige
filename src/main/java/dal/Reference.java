/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Objects;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "Reference", uniqueConstraints = {
        @UniqueConstraint(name = "UK_Refch0c4o3olc65u3yap006nxq0i", columnNames = { "id", "emplacement_id",
                "devis" }) })
@NamedQueries({
        @NamedQuery(name = "Reference.lastReference", query = "SELECT a FROM Reference a WHERE a.id=:id AND a.emplacement.lgEMPLACEMENTID=:emplacement AND a.devis=:devis") })
public class Reference implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false)
    private String id;
    @NotBlank
    @NotNull
    @Column(length = 20, nullable = false)
    private String reference;
    @Column(name = "reference_temp", length = 20)
    private String referenceTemp;
    @JoinColumn(name = "emplacement_id", referencedColumnName = "lg_EMPLACEMENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TEmplacement emplacement;
    @Column(name = "last_int_value", length = 8, nullable = false)
    private int lastIntValue;
    @Column(name = "last_int_tmp_value", length = 8, nullable = false)
    private int lastIntTmpValue;

    @Column(name = "devis")
    private boolean devis = false;

    public boolean isDevis() {
        return devis;
    }

    public void setDevis(boolean devis) {
        this.devis = devis;
    }

    public Reference devis(boolean devis) {
        this.devis = devis;
        return this;
    }

    public Reference() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Reference id(String id) {
        this.id = id;
        return this;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Reference reference(String reference) {
        this.reference = reference;
        return this;
    }

    public Reference referenceTemp(String referenceTemp) {
        this.referenceTemp = referenceTemp;
        return this;
    }

    public Reference addEmplacement(TEmplacement emplacement) {
        this.emplacement = emplacement;
        return this;
    }

    public String getReferenceTemp() {
        return referenceTemp;
    }

    public void setReferenceTemp(String referenceTemp) {
        this.referenceTemp = referenceTemp;
    }

    public TEmplacement getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(TEmplacement emplacement) {
        this.emplacement = emplacement;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 47 * hash + Objects.hashCode(this.id);
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
        final Reference other = (Reference) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "Reference{" + "id=" + id + ", reference=" + reference + ", referenceTemp=" + referenceTemp + '}';
    }

    public int getLastIntValue() {
        return lastIntValue;
    }

    public void setLastIntValue(int lastIntValue) {
        this.lastIntValue = lastIntValue;
    }

    public int getLastIntTmpValue() {
        return lastIntTmpValue;
    }

    public void setLastIntTmpValue(int lastIntTmpValue) {
        this.lastIntTmpValue = lastIntTmpValue;
    }

    public Reference lastIntValue(int lastIntValue) {
        this.lastIntValue = lastIntValue;
        return this;
    }

    public Reference lastIntTmpValue(int lastIntTmpValue) {
        this.lastIntTmpValue = lastIntTmpValue;
        return this;
    }
}
