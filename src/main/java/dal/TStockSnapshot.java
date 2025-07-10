/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDate;
import javax.persistence.Column;
import javax.persistence.EmbeddedId;
import javax.persistence.Entity;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;

/**
 *
 * @author DICI
 */
@Entity
@Table(name = "t_stock_snapshot")
@NamedQueries({
        @NamedQuery(name = "TStockSnapshot.findAll", query = " SELECT o FROM TStockSnapshot o ORDER BY o.tStockSnapshotPK.familleId ASC ")

})
public class TStockSnapshot implements Serializable {

    private static final long serialVersionUID = 1L;
    @EmbeddedId
    protected TStockSnapshotPK tStockSnapshotPK;
    @Column(name = "prixPaf")
    private Integer prixPaf;
    @Column(name = "prixTarif")
    private Integer prixTarif;
    @Column(name = "prixUni")
    private Integer prixUni;
    @Column(name = "qty")
    private Integer qty;
    @Column(name = "valeurTva")
    private Integer valeurTva;
    @Column(name = "prix_moyent_pondere")
    private Integer prixMoyentpondere;

    public TStockSnapshot() {
    }

    public TStockSnapshot(TStockSnapshotPK tStockSnapshotPK) {
        this.tStockSnapshotPK = tStockSnapshotPK;
    }

    public TStockSnapshot(LocalDate id, String magasin, String familleId) {
        this.tStockSnapshotPK = new TStockSnapshotPK(id, magasin, familleId);
    }

    public TStockSnapshotPK getTStockSnapshotPK() {
        return tStockSnapshotPK;
    }

    public void setTStockSnapshotPK(TStockSnapshotPK tStockSnapshotPK) {
        this.tStockSnapshotPK = tStockSnapshotPK;
    }

    public Integer getPrixPaf() {
        return prixPaf;
    }

    public void setPrixPaf(Integer prixPaf) {
        this.prixPaf = prixPaf;
    }

    public Integer getPrixTarif() {
        return prixTarif;
    }

    public void setPrixTarif(Integer prixTarif) {
        this.prixTarif = prixTarif;
    }

    public Integer getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(Integer prixUni) {
        this.prixUni = prixUni;
    }

    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    public Integer getValeurTva() {
        return valeurTva;
    }

    public void setValeurTva(Integer valeurTva) {
        this.valeurTva = valeurTva;
    }

    public Integer getPrixMoyentpondere() {
        return prixMoyentpondere;
    }

    public void setPrixMoyentpondere(Integer prixMoyentpondere) {
        this.prixMoyentpondere = prixMoyentpondere;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (tStockSnapshotPK != null ? tStockSnapshotPK.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TStockSnapshot)) {
            return false;
        }
        TStockSnapshot other = (TStockSnapshot) object;
        if ((this.tStockSnapshotPK == null && other.tStockSnapshotPK != null)
                || (this.tStockSnapshotPK != null && !this.tStockSnapshotPK.equals(other.tStockSnapshotPK))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TStockSnapshot[ tStockSnapshotPK=" + tStockSnapshotPK + " ]";
    }

}
