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
@Table(name = "t_typecontencieux")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypecontencieux.findAll", query = "SELECT t FROM TTypecontencieux t"),
        @NamedQuery(name = "TTypecontencieux.findByLgTYPECONTENCIEUXID", query = "SELECT t FROM TTypecontencieux t WHERE t.lgTYPECONTENCIEUXID = :lgTYPECONTENCIEUXID"),
        @NamedQuery(name = "TTypecontencieux.findByStrNAME", query = "SELECT t FROM TTypecontencieux t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypecontencieux.findByStrDESCRIPTION", query = "SELECT t FROM TTypecontencieux t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypecontencieux.findByDtCREATED", query = "SELECT t FROM TTypecontencieux t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypecontencieux.findByDtUPDATED", query = "SELECT t FROM TTypecontencieux t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypecontencieux.findByStrSTATUT", query = "SELECT t FROM TTypecontencieux t WHERE t.strSTATUT = :strSTATUT") })
public class TTypecontencieux implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPECONTENCIEUX_ID", nullable = false, length = 40)
    private String lgTYPECONTENCIEUXID;
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
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "lgTYPECONTENCIEUXID")
    private Collection<TContencieux> tContencieuxCollection;

    public TTypecontencieux() {
    }

    public TTypecontencieux(String lgTYPECONTENCIEUXID) {
        this.lgTYPECONTENCIEUXID = lgTYPECONTENCIEUXID;
    }

    public TTypecontencieux(String lgTYPECONTENCIEUXID, String strNAME, String strDESCRIPTION) {
        this.lgTYPECONTENCIEUXID = lgTYPECONTENCIEUXID;
        this.strNAME = strNAME;
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgTYPECONTENCIEUXID() {
        return lgTYPECONTENCIEUXID;
    }

    public void setLgTYPECONTENCIEUXID(String lgTYPECONTENCIEUXID) {
        this.lgTYPECONTENCIEUXID = lgTYPECONTENCIEUXID;
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
    public Collection<TContencieux> getTContencieuxCollection() {
        return tContencieuxCollection;
    }

    public void setTContencieuxCollection(Collection<TContencieux> tContencieuxCollection) {
        this.tContencieuxCollection = tContencieuxCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPECONTENCIEUXID != null ? lgTYPECONTENCIEUXID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypecontencieux)) {
            return false;
        }
        TTypecontencieux other = (TTypecontencieux) object;
        if ((this.lgTYPECONTENCIEUXID == null && other.lgTYPECONTENCIEUXID != null)
                || (this.lgTYPECONTENCIEUXID != null && !this.lgTYPECONTENCIEUXID.equals(other.lgTYPECONTENCIEUXID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypecontencieux[ lgTYPECONTENCIEUXID=" + lgTYPECONTENCIEUXID + " ]";
    }

}
