/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDate;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 *
 * @author DICI
 */
@Embeddable
public class TStockSnapshotPK implements Serializable {

    @Basic(optional = false)
    @NotNull
    @Column(name = "id")
    // @Temporal(TemporalType.DATE)
    private LocalDate id;
    @Basic(optional = false)
    @NotNull
    @Size(min = 1, max = 40)
    @Column(name = "magasin")
    private String magasin;
    @Basic(optional = false)
    @NotNull
    @Size(min = 1, max = 40)
    @Column(name = "familleId")
    private String familleId;

    public TStockSnapshotPK() {
    }

    public TStockSnapshotPK(LocalDate id, String magasin, String familleId) {
        this.id = id;
        this.magasin = magasin;
        this.familleId = familleId;
    }

    public LocalDate getId() {
        return id;
    }

    public void setId(LocalDate id) {
        this.id = id;
    }

    public String getMagasin() {
        return magasin;
    }

    public void setMagasin(String magasin) {
        this.magasin = magasin;
    }

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (id != null ? id.hashCode() : 0);
        hash += (magasin != null ? magasin.hashCode() : 0);
        hash += (familleId != null ? familleId.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TStockSnapshotPK)) {
            return false;
        }
        TStockSnapshotPK other = (TStockSnapshotPK) object;
        if ((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id))) {
            return false;
        }
        if ((this.magasin == null && other.magasin != null)
                || (this.magasin != null && !this.magasin.equals(other.magasin))) {
            return false;
        }
        if ((this.familleId == null && other.familleId != null)
                || (this.familleId != null && !this.familleId.equals(other.familleId))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TStockSnapshotPK[ id=" + id + ", magasin=" + magasin + ", familleId=" + familleId + " ]";
    }

}
