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
@Table(name = "t_type_client")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeClient.findAll", query = "SELECT t FROM TTypeClient t"),
        @NamedQuery(name = "TTypeClient.findByLgTYPECLIENTID", query = "SELECT t FROM TTypeClient t WHERE t.lgTYPECLIENTID = :lgTYPECLIENTID"),
        @NamedQuery(name = "TTypeClient.findByStrNAME", query = "SELECT t FROM TTypeClient t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypeClient.findByStrTYPE", query = "SELECT t FROM TTypeClient t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TTypeClient.findByStrDESCRIPTION", query = "SELECT t FROM TTypeClient t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypeClient.findByStrSTATUT", query = "SELECT t FROM TTypeClient t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeClient.findByDtCREATED", query = "SELECT t FROM TTypeClient t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeClient.findByDtUPDATED", query = "SELECT t FROM TTypeClient t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypeClient implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_CLIENT_ID", nullable = false, length = 40)
    private String lgTYPECLIENTID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Column(name = "str_TYPE", length = 50)
    private String strTYPE;
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
    @OneToMany(mappedBy = "lgTYPECLIENTID")
    private Collection<TClient> tClientCollection;

    public TTypeClient() {
    }

    public TTypeClient(String lgTYPECLIENTID) {
        this.lgTYPECLIENTID = lgTYPECLIENTID;
    }

    public String getLgTYPECLIENTID() {
        return lgTYPECLIENTID;
    }

    public void setLgTYPECLIENTID(String lgTYPECLIENTID) {
        this.lgTYPECLIENTID = lgTYPECLIENTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
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
    public Collection<TClient> getTClientCollection() {
        return tClientCollection;
    }

    public void setTClientCollection(Collection<TClient> tClientCollection) {
        this.tClientCollection = tClientCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPECLIENTID != null ? lgTYPECLIENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeClient)) {
            return false;
        }
        TTypeClient other = (TTypeClient) object;
        if ((this.lgTYPECLIENTID == null && other.lgTYPECLIENTID != null)
                || (this.lgTYPECLIENTID != null && !this.lgTYPECLIENTID.equals(other.lgTYPECLIENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeClient[ lgTYPECLIENTID=" + lgTYPECLIENTID + " ]";
    }

}
