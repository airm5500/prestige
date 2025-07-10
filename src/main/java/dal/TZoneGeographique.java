/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_zone_geographique")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TZoneGeographique.findAll", query = "SELECT t FROM TZoneGeographique t"),
        @NamedQuery(name = "TZoneGeographique.findByLgZONEGEOID", query = "SELECT t FROM TZoneGeographique t WHERE t.lgZONEGEOID = :lgZONEGEOID"),
        @NamedQuery(name = "TZoneGeographique.findByStrLIBELLEE", query = "SELECT t FROM TZoneGeographique t WHERE t.strLIBELLEE = :strLIBELLEE"),
        @NamedQuery(name = "TZoneGeographique.findByStrCODE", query = "SELECT t FROM TZoneGeographique t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TZoneGeographique.findByDtCREATED", query = "SELECT t FROM TZoneGeographique t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TZoneGeographique.findByDtUPDATED", query = "SELECT t FROM TZoneGeographique t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TZoneGeographique.findByStrSTATUT", query = "SELECT t FROM TZoneGeographique t WHERE t.strSTATUT = :strSTATUT") })
public class TZoneGeographique implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ZONE_GEO_ID", nullable = false, length = 40)
    private String lgZONEGEOID;
    @Column(name = "str_LIBELLEE", length = 40)
    private String strLIBELLEE;
    @Column(name = "str_CODE", length = 20)
    private String strCODE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;
    @OneToMany(mappedBy = "lgZONEGEOID")
    private Collection<TFamilleZonegeo> tFamilleZonegeoCollection;
    @OneToMany(mappedBy = "lgZONEGEOID")
    private Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection;
    @OneToMany(mappedBy = "lgZONEGEOID")
    private Collection<TFamille> tFamilleCollection;
    @Column(name = "bool_ACCOUNT")
    private Boolean boolACCOUNT;

    public TZoneGeographique() {
    }

    public TZoneGeographique(String lgZONEGEOID) {
        this.lgZONEGEOID = lgZONEGEOID;
    }

    public String getLgZONEGEOID() {
        return lgZONEGEOID;
    }

    public void setLgZONEGEOID(String lgZONEGEOID) {
        this.lgZONEGEOID = lgZONEGEOID;
    }

    public String getStrLIBELLEE() {
        return strLIBELLEE;
    }

    public void setStrLIBELLEE(String strLIBELLEE) {
        this.strLIBELLEE = strLIBELLEE;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @XmlTransient
    public Collection<TFamilleZonegeo> getTFamilleZonegeoCollection() {
        return tFamilleZonegeoCollection;
    }

    public void setTFamilleZonegeoCollection(Collection<TFamilleZonegeo> tFamilleZonegeoCollection) {
        this.tFamilleZonegeoCollection = tFamilleZonegeoCollection;
    }

    @XmlTransient
    public Collection<TBonLivraisonDetail> getTBonLivraisonDetailCollection() {
        return tBonLivraisonDetailCollection;
    }

    public void setTBonLivraisonDetailCollection(Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection) {
        this.tBonLivraisonDetailCollection = tBonLivraisonDetailCollection;
    }

    @XmlTransient
    public Collection<TFamille> getTFamilleCollection() {
        return tFamilleCollection;
    }

    public void setTFamilleCollection(Collection<TFamille> tFamilleCollection) {
        this.tFamilleCollection = tFamilleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgZONEGEOID != null ? lgZONEGEOID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TZoneGeographique)) {
            return false;
        }
        TZoneGeographique other = (TZoneGeographique) object;
        if ((this.lgZONEGEOID == null && other.lgZONEGEOID != null)
                || (this.lgZONEGEOID != null && !this.lgZONEGEOID.equals(other.lgZONEGEOID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TZoneGeographique[ lgZONEGEOID=" + lgZONEGEOID + " ]";
    }

    public Boolean getBoolACCOUNT() {
        return boolACCOUNT;
    }

    public void setBoolACCOUNT(Boolean boolACCOUNT) {
        this.boolACCOUNT = boolACCOUNT;
    }

}
