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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_dci", uniqueConstraints = { @UniqueConstraint(columnNames = { "str_CODE" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TDci.findAll", query = "SELECT t FROM TDci t"),
        @NamedQuery(name = "TDci.findByLgDCIID", query = "SELECT t FROM TDci t WHERE t.lgDCIID = :lgDCIID"),
        @NamedQuery(name = "TDci.findByStrCODE", query = "SELECT t FROM TDci t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TDci.findByStrNAME", query = "SELECT t FROM TDci t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TDci.findByStrSTATUT", query = "SELECT t FROM TDci t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TDci.findByDtCREATED", query = "SELECT t FROM TDci t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TDci.findByDtUPDATED", query = "SELECT t FROM TDci t WHERE t.dtUPDATED = :dtUPDATED") })
public class TDci implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DCI_ID", nullable = false, length = 40)
    private String lgDCIID;
    @Column(name = "str_CODE", length = 40)
    private String strCODE;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgDCIID")
    private Collection<TFamilleDci> tFamilleDciCollection;

    public TDci() {
    }

    public TDci(String lgDCIID) {
        this.lgDCIID = lgDCIID;
    }

    public String getLgDCIID() {
        return lgDCIID;
    }

    public void setLgDCIID(String lgDCIID) {
        this.lgDCIID = lgDCIID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
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
    public Collection<TFamilleDci> getTFamilleDciCollection() {
        return tFamilleDciCollection;
    }

    public void setTFamilleDciCollection(Collection<TFamilleDci> tFamilleDciCollection) {
        this.tFamilleDciCollection = tFamilleDciCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgDCIID != null ? lgDCIID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDci)) {
            return false;
        }
        TDci other = (TDci) object;
        if ((this.lgDCIID == null && other.lgDCIID != null)
                || (this.lgDCIID != null && !this.lgDCIID.equals(other.lgDCIID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDci[ lgDCIID=" + lgDCIID + " ]";
    }

}
