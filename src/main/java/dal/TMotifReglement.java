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
@Table(name = "t_motif_reglement", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_MOTIF_REGLEMENT_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMotifReglement.findAll", query = "SELECT t FROM TMotifReglement t"),
        @NamedQuery(name = "TMotifReglement.findByLgMOTIFREGLEMENTID", query = "SELECT t FROM TMotifReglement t WHERE t.lgMOTIFREGLEMENTID = :lgMOTIFREGLEMENTID"),
        @NamedQuery(name = "TMotifReglement.findByStrNAME", query = "SELECT t FROM TMotifReglement t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TMotifReglement.findByStrDESCRIPTION", query = "SELECT t FROM TMotifReglement t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TMotifReglement.findByDtCREATED", query = "SELECT t FROM TMotifReglement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMotifReglement.findByDtUPDATED", query = "SELECT t FROM TMotifReglement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMotifReglement.findByStrSTATUT", query = "SELECT t FROM TMotifReglement t WHERE t.strSTATUT = :strSTATUT") })
public class TMotifReglement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOTIF_REGLEMENT_ID", nullable = false, length = 40)
    private String lgMOTIFREGLEMENTID;
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
    @OneToMany(mappedBy = "lgMOTIFREGLEMENTID")
    private Collection<TCashTransaction> tCashTransactionCollection;

    public TMotifReglement() {
    }

    public TMotifReglement(String lgMOTIFREGLEMENTID) {
        this.lgMOTIFREGLEMENTID = lgMOTIFREGLEMENTID;
    }

    public String getLgMOTIFREGLEMENTID() {
        return lgMOTIFREGLEMENTID;
    }

    public void setLgMOTIFREGLEMENTID(String lgMOTIFREGLEMENTID) {
        this.lgMOTIFREGLEMENTID = lgMOTIFREGLEMENTID;
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
    public Collection<TCashTransaction> getTCashTransactionCollection() {
        return tCashTransactionCollection;
    }

    public void setTCashTransactionCollection(Collection<TCashTransaction> tCashTransactionCollection) {
        this.tCashTransactionCollection = tCashTransactionCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMOTIFREGLEMENTID != null ? lgMOTIFREGLEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMotifReglement)) {
            return false;
        }
        TMotifReglement other = (TMotifReglement) object;
        if ((this.lgMOTIFREGLEMENTID == null && other.lgMOTIFREGLEMENTID != null)
                || (this.lgMOTIFREGLEMENTID != null && !this.lgMOTIFREGLEMENTID.equals(other.lgMOTIFREGLEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMotifReglement[ lgMOTIFREGLEMENTID=" + lgMOTIFREGLEMENTID + " ]";
    }

}
