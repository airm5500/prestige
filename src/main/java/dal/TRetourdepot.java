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
import javax.persistence.CascadeType;
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
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_retourdepot")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRetourdepot.findAll", query = "SELECT t FROM TRetourdepot t"),
        @NamedQuery(name = "TRetourdepot.findByLgRETOURDEPOTID", query = "SELECT t FROM TRetourdepot t WHERE t.lgRETOURDEPOTID = :lgRETOURDEPOTID"),
        @NamedQuery(name = "TRetourdepot.findByStrNAME", query = "SELECT t FROM TRetourdepot t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TRetourdepot.findByStrCOMMENTAIRE", query = "SELECT t FROM TRetourdepot t WHERE t.strCOMMENTAIRE = :strCOMMENTAIRE"),
        @NamedQuery(name = "TRetourdepot.findByStrSTATUT", query = "SELECT t FROM TRetourdepot t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRetourdepot.findByDtUPDATED", query = "SELECT t FROM TRetourdepot t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TRetourdepot.findByDtCREATED", query = "SELECT t FROM TRetourdepot t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRetourdepot.findByDblAMOUNT", query = "SELECT t FROM TRetourdepot t WHERE t.dblAMOUNT = :dblAMOUNT"),
        @NamedQuery(name = "TRetourdepot.findByBoolFLAG", query = "SELECT t FROM TRetourdepot t WHERE t.boolFLAG = :boolFLAG") })
public class TRetourdepot implements Serializable {

    @Column(name = "PKEY")
    private String pkey;

    @Column(name = "bool_pending")
    private Boolean boolPending;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RETOURDEPOT_ID", nullable = false, length = 40)
    private String lgRETOURDEPOTID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Column(name = "str_COMMENTAIRE", length = 50)
    private String strCOMMENTAIRE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Basic(optional = false)
    @Column(name = "dbl_AMOUNT", nullable = false)
    private double dblAMOUNT;
    @Column(name = "bool_FLAG")
    private Boolean boolFLAG;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;
    @OneToMany(mappedBy = "lgRETOURDEPOTID", cascade = CascadeType.PERSIST)
    private Collection<TRetourdepotdetail> tRetourdepotdetailCollection;

    public TRetourdepot() {
    }

    public TRetourdepot(String lgRETOURDEPOTID) {
        this.lgRETOURDEPOTID = lgRETOURDEPOTID;
    }

    public TRetourdepot(String lgRETOURDEPOTID, double dblAMOUNT) {
        this.lgRETOURDEPOTID = lgRETOURDEPOTID;
        this.dblAMOUNT = dblAMOUNT;
    }

    public String getLgRETOURDEPOTID() {
        return lgRETOURDEPOTID;
    }

    public void setLgRETOURDEPOTID(String lgRETOURDEPOTID) {
        this.lgRETOURDEPOTID = lgRETOURDEPOTID;
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

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public double getDblAMOUNT() {
        return dblAMOUNT;
    }

    public void setDblAMOUNT(double dblAMOUNT) {
        this.dblAMOUNT = dblAMOUNT;
    }

    public Boolean getBoolFLAG() {
        return boolFLAG;
    }

    public void setBoolFLAG(Boolean boolFLAG) {
        this.boolFLAG = boolFLAG;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @XmlTransient
    public Collection<TRetourdepotdetail> getTRetourdepotdetailCollection() {
        return tRetourdepotdetailCollection;
    }

    public void setTRetourdepotdetailCollection(Collection<TRetourdepotdetail> tRetourdepotdetailCollection) {
        this.tRetourdepotdetailCollection = tRetourdepotdetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgRETOURDEPOTID != null ? lgRETOURDEPOTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRetourdepot)) {
            return false;
        }
        TRetourdepot other = (TRetourdepot) object;
        if ((this.lgRETOURDEPOTID == null && other.lgRETOURDEPOTID != null)
                || (this.lgRETOURDEPOTID != null && !this.lgRETOURDEPOTID.equals(other.lgRETOURDEPOTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRetourdepot[ lgRETOURDEPOTID=" + lgRETOURDEPOTID + " ]";
    }

    public Boolean getBoolPending() {
        return boolPending;
    }

    public void setBoolPending(Boolean boolPending) {
        this.boolPending = boolPending;
    }

    public String getPkey() {
        return pkey;
    }

    public void setPkey(String pkey) {
        this.pkey = pkey;
    }

}
