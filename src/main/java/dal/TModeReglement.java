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
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_mode_reglement", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_MODE_REGLEMENT_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TModeReglement.findAll", query = "SELECT t FROM TModeReglement t"),
        @NamedQuery(name = "TModeReglement.findByLgMODEREGLEMENTID", query = "SELECT t FROM TModeReglement t WHERE t.lgMODEREGLEMENTID = :lgMODEREGLEMENTID"),
        @NamedQuery(name = "TModeReglement.findByStrNAME", query = "SELECT t FROM TModeReglement t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TModeReglement.findByStrDESCRIPTION", query = "SELECT t FROM TModeReglement t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TModeReglement.findByDtCREATED", query = "SELECT t FROM TModeReglement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TModeReglement.findByDtUPDATED", query = "SELECT t FROM TModeReglement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TModeReglement.findByStrSTATUT", query = "SELECT t FROM TModeReglement t WHERE t.strSTATUT = :strSTATUT") })
public class TModeReglement implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MODE_REGLEMENT_ID", nullable = false, length = 40)
    private String lgMODEREGLEMENTID;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 40)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @JoinColumn(name = "lg_TYPE_REGLEMENT_ID", referencedColumnName = "lg_TYPE_REGLEMENT_ID")
    @ManyToOne
    private TTypeReglement lgTYPEREGLEMENTID;
    @OneToMany(mappedBy = "lgMODEREGLEMENTID")
    private Collection<TReglementTransaction> tReglementTransactionCollection;
    @OneToMany(mappedBy = "lgMODEREGLEMENTID")
    private Collection<TMvtCaisse> tMvtCaisseCollection;
    @OneToMany(mappedBy = "lgMODEREGLEMENTID")
    private Collection<TReglement> tReglementCollection;
    @Lob
    @Column(name = "qr_code", columnDefinition = "MEDIUMBLOB")
    private byte[] qrCode;

    public TModeReglement() {
    }

    public byte[] getQrCode() {
        return qrCode;
    }

    public void setQrCode(byte[] qrCode) {
        this.qrCode = qrCode;
    }

    public TModeReglement(String lgMODEREGLEMENTID) {
        this.lgMODEREGLEMENTID = lgMODEREGLEMENTID;
    }

    public String getLgMODEREGLEMENTID() {
        return lgMODEREGLEMENTID;
    }

    public void setLgMODEREGLEMENTID(String lgMODEREGLEMENTID) {
        this.lgMODEREGLEMENTID = lgMODEREGLEMENTID;
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

    public TTypeReglement getLgTYPEREGLEMENTID() {
        return lgTYPEREGLEMENTID;
    }

    public void setLgTYPEREGLEMENTID(TTypeReglement lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
    }

    @XmlTransient
    public Collection<TReglementTransaction> getTReglementTransactionCollection() {
        return tReglementTransactionCollection;
    }

    public void setTReglementTransactionCollection(Collection<TReglementTransaction> tReglementTransactionCollection) {
        this.tReglementTransactionCollection = tReglementTransactionCollection;
    }

    @XmlTransient
    public Collection<TMvtCaisse> getTMvtCaisseCollection() {
        return tMvtCaisseCollection;
    }

    public void setTMvtCaisseCollection(Collection<TMvtCaisse> tMvtCaisseCollection) {
        this.tMvtCaisseCollection = tMvtCaisseCollection;
    }

    @XmlTransient
    public Collection<TReglement> getTReglementCollection() {
        return tReglementCollection;
    }

    public void setTReglementCollection(Collection<TReglement> tReglementCollection) {
        this.tReglementCollection = tReglementCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMODEREGLEMENTID != null ? lgMODEREGLEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TModeReglement)) {
            return false;
        }
        TModeReglement other = (TModeReglement) object;
        if ((this.lgMODEREGLEMENTID == null && other.lgMODEREGLEMENTID != null)
                || (this.lgMODEREGLEMENTID != null && !this.lgMODEREGLEMENTID.equals(other.lgMODEREGLEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TModeReglement[ lgMODEREGLEMENTID=" + lgMODEREGLEMENTID + " ]";
    }

}
