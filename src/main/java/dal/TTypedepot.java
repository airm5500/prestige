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
@Table(name = "t_typedepot")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypedepot.findAll", query = "SELECT t FROM TTypedepot t"),
        @NamedQuery(name = "TTypedepot.findByLgTYPEDEPOTID", query = "SELECT t FROM TTypedepot t WHERE t.lgTYPEDEPOTID = :lgTYPEDEPOTID"),
        @NamedQuery(name = "TTypedepot.findByStrNAME", query = "SELECT t FROM TTypedepot t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypedepot.findByStrDESCRIPTION", query = "SELECT t FROM TTypedepot t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypedepot.findByStrSTATUT", query = "SELECT t FROM TTypedepot t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypedepot.findByDtCREATED", query = "SELECT t FROM TTypedepot t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypedepot.findByDtUPDATED", query = "SELECT t FROM TTypedepot t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypedepot implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPEDEPOT_ID", nullable = false, length = 40)
    private String lgTYPEDEPOTID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 100)
    private String strDESCRIPTION;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "lgTYPEDEPOTID")
    private Collection<TEmplacement> tEmplacementCollection;

    public TTypedepot() {
    }

    public TTypedepot(String lgTYPEDEPOTID) {
        this.lgTYPEDEPOTID = lgTYPEDEPOTID;
    }

    public String getLgTYPEDEPOTID() {
        return lgTYPEDEPOTID;
    }

    public void setLgTYPEDEPOTID(String lgTYPEDEPOTID) {
        this.lgTYPEDEPOTID = lgTYPEDEPOTID;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
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

    @XmlTransient
    public Collection<TEmplacement> getTEmplacementCollection() {
        return tEmplacementCollection;
    }

    public void setTEmplacementCollection(Collection<TEmplacement> tEmplacementCollection) {
        this.tEmplacementCollection = tEmplacementCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEDEPOTID != null ? lgTYPEDEPOTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypedepot)) {
            return false;
        }
        TTypedepot other = (TTypedepot) object;
        if ((this.lgTYPEDEPOTID == null && other.lgTYPEDEPOTID != null)
                || (this.lgTYPEDEPOTID != null && !this.lgTYPEDEPOTID.equals(other.lgTYPEDEPOTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypedepot[ lgTYPEDEPOTID=" + lgTYPEDEPOTID + " ]";
    }

}
