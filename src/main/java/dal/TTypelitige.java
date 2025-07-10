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
@Table(name = "t_typelitige")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypelitige.findAll", query = "SELECT t FROM TTypelitige t"),
        @NamedQuery(name = "TTypelitige.findByLgTYPELITIGEID", query = "SELECT t FROM TTypelitige t WHERE t.lgTYPELITIGEID = :lgTYPELITIGEID"),
        @NamedQuery(name = "TTypelitige.findByStrNAME", query = "SELECT t FROM TTypelitige t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypelitige.findByStrDESCRIPTION", query = "SELECT t FROM TTypelitige t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypelitige.findByDtCREATED", query = "SELECT t FROM TTypelitige t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypelitige.findByDtUPDATED", query = "SELECT t FROM TTypelitige t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypelitige.findByStrSTATUT", query = "SELECT t FROM TTypelitige t WHERE t.strSTATUT = :strSTATUT") })
public class TTypelitige implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPELITIGE_ID", nullable = false, length = 40)
    private String lgTYPELITIGEID;
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
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "lgTYPELITIGEID")
    private Collection<TLitige> tLitigeCollection;

    public TTypelitige() {
    }

    public TTypelitige(String lgTYPELITIGEID) {
        this.lgTYPELITIGEID = lgTYPELITIGEID;
    }

    public TTypelitige(String lgTYPELITIGEID, String strNAME, String strDESCRIPTION) {
        this.lgTYPELITIGEID = lgTYPELITIGEID;
        this.strNAME = strNAME;
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgTYPELITIGEID() {
        return lgTYPELITIGEID;
    }

    public void setLgTYPELITIGEID(String lgTYPELITIGEID) {
        this.lgTYPELITIGEID = lgTYPELITIGEID;
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
    public Collection<TLitige> getTLitigeCollection() {
        return tLitigeCollection;
    }

    public void setTLitigeCollection(Collection<TLitige> tLitigeCollection) {
        this.tLitigeCollection = tLitigeCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPELITIGEID != null ? lgTYPELITIGEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypelitige)) {
            return false;
        }
        TTypelitige other = (TTypelitige) object;
        if ((this.lgTYPELITIGEID == null && other.lgTYPELITIGEID != null)
                || (this.lgTYPELITIGEID != null && !this.lgTYPELITIGEID.equals(other.lgTYPELITIGEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypelitige[ lgTYPELITIGEID=" + lgTYPELITIGEID + " ]";
    }

}
