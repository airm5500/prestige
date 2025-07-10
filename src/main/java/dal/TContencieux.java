/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_contencieux")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TContencieux.findAll", query = "SELECT t FROM TContencieux t"),
        @NamedQuery(name = "TContencieux.findByLgCONTENCIEUXID", query = "SELECT t FROM TContencieux t WHERE t.lgCONTENCIEUXID = :lgCONTENCIEUXID"),
        @NamedQuery(name = "TContencieux.findByStrNAME", query = "SELECT t FROM TContencieux t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TContencieux.findByStrREF", query = "SELECT t FROM TContencieux t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TContencieux.findByStrDESCRIPTION", query = "SELECT t FROM TContencieux t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TContencieux.findByDtCREATED", query = "SELECT t FROM TContencieux t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TContencieux.findByDtUPDATED", query = "SELECT t FROM TContencieux t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TContencieux.findByStrSTATUT", query = "SELECT t FROM TContencieux t WHERE t.strSTATUT = :strSTATUT") })
public class TContencieux implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CONTENCIEUX_ID", nullable = false, length = 40)
    private String lgCONTENCIEUXID;
    @Basic(optional = false)
    @Column(name = "str_NAME", nullable = false, length = 100)
    private String strNAME;
    @Basic(optional = false)
    @Column(name = "str_REF", nullable = false, length = 100)
    private String strREF;
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
    @JoinColumn(name = "lg_TYPECONTENCIEUX_ID", referencedColumnName = "lg_TYPECONTENCIEUX_ID", nullable = false)
    @ManyToOne(optional = false)
    private TTypecontencieux lgTYPECONTENCIEUXID;

    public TContencieux() {
    }

    public TContencieux(String lgCONTENCIEUXID) {
        this.lgCONTENCIEUXID = lgCONTENCIEUXID;
    }

    public TContencieux(String lgCONTENCIEUXID, String strNAME, String strREF, String strDESCRIPTION) {
        this.lgCONTENCIEUXID = lgCONTENCIEUXID;
        this.strNAME = strNAME;
        this.strREF = strREF;
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgCONTENCIEUXID() {
        return lgCONTENCIEUXID;
    }

    public void setLgCONTENCIEUXID(String lgCONTENCIEUXID) {
        this.lgCONTENCIEUXID = lgCONTENCIEUXID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
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

    public TTypecontencieux getLgTYPECONTENCIEUXID() {
        return lgTYPECONTENCIEUXID;
    }

    public void setLgTYPECONTENCIEUXID(TTypecontencieux lgTYPECONTENCIEUXID) {
        this.lgTYPECONTENCIEUXID = lgTYPECONTENCIEUXID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCONTENCIEUXID != null ? lgCONTENCIEUXID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TContencieux)) {
            return false;
        }
        TContencieux other = (TContencieux) object;
        if ((this.lgCONTENCIEUXID == null && other.lgCONTENCIEUXID != null)
                || (this.lgCONTENCIEUXID != null && !this.lgCONTENCIEUXID.equals(other.lgCONTENCIEUXID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TContencieux[ lgCONTENCIEUXID=" + lgCONTENCIEUXID + " ]";
    }

}
