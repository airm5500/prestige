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
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_type_promo", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_TYPE_PROMO_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypePromo.findAll", query = "SELECT t FROM TTypePromo t"),
        @NamedQuery(name = "TTypePromo.findByLgTYPEPROMOID", query = "SELECT t FROM TTypePromo t WHERE t.lgTYPEPROMOID = :lgTYPEPROMOID"),
        @NamedQuery(name = "TTypePromo.findByStrNAME", query = "SELECT t FROM TTypePromo t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypePromo.findByStrDESCRIPTION", query = "SELECT t FROM TTypePromo t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypePromo.findByDtCREATED", query = "SELECT t FROM TTypePromo t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypePromo.findByDtUPDATED", query = "SELECT t FROM TTypePromo t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypePromo.findByStrSTATUT", query = "SELECT t FROM TTypePromo t WHERE t.strSTATUT = :strSTATUT") })
public class TTypePromo implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_PROMO_ID", nullable = false, length = 40)
    private String lgTYPEPROMOID;
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

    public TTypePromo() {
    }

    public TTypePromo(String lgTYPEPROMOID) {
        this.lgTYPEPROMOID = lgTYPEPROMOID;
    }

    public String getLgTYPEPROMOID() {
        return lgTYPEPROMOID;
    }

    public void setLgTYPEPROMOID(String lgTYPEPROMOID) {
        this.lgTYPEPROMOID = lgTYPEPROMOID;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEPROMOID != null ? lgTYPEPROMOID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypePromo)) {
            return false;
        }
        TTypePromo other = (TTypePromo) object;
        if ((this.lgTYPEPROMOID == null && other.lgTYPEPROMOID != null)
                || (this.lgTYPEPROMOID != null && !this.lgTYPEPROMOID.equals(other.lgTYPEPROMOID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypePromo[ lgTYPEPROMOID=" + lgTYPEPROMOID + " ]";
    }

}
