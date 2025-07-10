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
@Table(name = "t_typeetiquette")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeetiquette.findAll", query = "SELECT t FROM TTypeetiquette t"),
        @NamedQuery(name = "TTypeetiquette.findByLgTYPEETIQUETTEID", query = "SELECT t FROM TTypeetiquette t WHERE t.lgTYPEETIQUETTEID = :lgTYPEETIQUETTEID"),
        @NamedQuery(name = "TTypeetiquette.findByStrNAME", query = "SELECT t FROM TTypeetiquette t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypeetiquette.findByStrDESCRIPTION", query = "SELECT t FROM TTypeetiquette t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypeetiquette.findByDtCREATED", query = "SELECT t FROM TTypeetiquette t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeetiquette.findByDtUPDATED", query = "SELECT t FROM TTypeetiquette t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeetiquette.findByStrSTATUT", query = "SELECT t FROM TTypeetiquette t WHERE t.strSTATUT = :strSTATUT") })
public class TTypeetiquette implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPEETIQUETTE_ID", nullable = false, length = 40)
    private String lgTYPEETIQUETTEID;
    @Basic(optional = false)
    @Column(name = "str_NAME", nullable = false, length = 40)
    private String strNAME;
    @Basic(optional = false)
    @Column(name = "str_DESCRIPTION", nullable = false, length = 100)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgTYPEETIQUETTEID")
    private Collection<TEtiquette> tEtiquetteCollection;
    @OneToMany(mappedBy = "lgTYPEETIQUETTEID")
    private Collection<TWarehouse> tWarehouseCollection;
    @OneToMany(mappedBy = "lgTYPEETIQUETTEID")
    private Collection<TLot> tLotCollection;
    @OneToMany(mappedBy = "lgTYPEETIQUETTEID")
    private Collection<TFamille> tFamilleCollection;

    public TTypeetiquette() {
    }

    public TTypeetiquette(String lgTYPEETIQUETTEID) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
    }

    public TTypeetiquette(String lgTYPEETIQUETTEID, String strNAME, String strDESCRIPTION) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
        this.strNAME = strNAME;
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgTYPEETIQUETTEID() {
        return lgTYPEETIQUETTEID;
    }

    public void setLgTYPEETIQUETTEID(String lgTYPEETIQUETTEID) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
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

    @XmlTransient
    public Collection<TEtiquette> getTEtiquetteCollection() {
        return tEtiquetteCollection;
    }

    public void setTEtiquetteCollection(Collection<TEtiquette> tEtiquetteCollection) {
        this.tEtiquetteCollection = tEtiquetteCollection;
    }

    @XmlTransient
    public Collection<TWarehouse> getTWarehouseCollection() {
        return tWarehouseCollection;
    }

    public void setTWarehouseCollection(Collection<TWarehouse> tWarehouseCollection) {
        this.tWarehouseCollection = tWarehouseCollection;
    }

    @XmlTransient
    public Collection<TLot> getTLotCollection() {
        return tLotCollection;
    }

    public void setTLotCollection(Collection<TLot> tLotCollection) {
        this.tLotCollection = tLotCollection;
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
        hash += (lgTYPEETIQUETTEID != null ? lgTYPEETIQUETTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeetiquette)) {
            return false;
        }
        TTypeetiquette other = (TTypeetiquette) object;
        if ((this.lgTYPEETIQUETTEID == null && other.lgTYPEETIQUETTEID != null)
                || (this.lgTYPEETIQUETTEID != null && !this.lgTYPEETIQUETTEID.equals(other.lgTYPEETIQUETTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeetiquette[ lgTYPEETIQUETTEID=" + lgTYPEETIQUETTEID + " ]";
    }

}
