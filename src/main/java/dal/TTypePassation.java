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
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_type_passation")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypePassation.findAll", query = "SELECT t FROM TTypePassation t"),
        @NamedQuery(name = "TTypePassation.findByLgTYPEPASSATIONID", query = "SELECT t FROM TTypePassation t WHERE t.lgTYPEPASSATIONID = :lgTYPEPASSATIONID"),
        @NamedQuery(name = "TTypePassation.findByStrCODE", query = "SELECT t FROM TTypePassation t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TTypePassation.findByStrLIBELLE", query = "SELECT t FROM TTypePassation t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TTypePassation.findByStrSTATUT", query = "SELECT t FROM TTypePassation t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypePassation.findByDtCREATED", query = "SELECT t FROM TTypePassation t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypePassation.findByDtUPDATED", query = "SELECT t FROM TTypePassation t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypePassation implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_PASSATION_ID", nullable = false, length = 20)
    private String lgTYPEPASSATIONID;
    @Column(name = "str_CODE", length = 20)
    private String strCODE;
    @Column(name = "str_LIBELLE", length = 20)
    private String strLIBELLE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TTypePassation() {
    }

    public TTypePassation(String lgTYPEPASSATIONID) {
        this.lgTYPEPASSATIONID = lgTYPEPASSATIONID;
    }

    public String getLgTYPEPASSATIONID() {
        return lgTYPEPASSATIONID;
    }

    public void setLgTYPEPASSATIONID(String lgTYPEPASSATIONID) {
        this.lgTYPEPASSATIONID = lgTYPEPASSATIONID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEPASSATIONID != null ? lgTYPEPASSATIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypePassation)) {
            return false;
        }
        TTypePassation other = (TTypePassation) object;
        if ((this.lgTYPEPASSATIONID == null && other.lgTYPEPASSATIONID != null)
                || (this.lgTYPEPASSATIONID != null && !this.lgTYPEPASSATIONID.equals(other.lgTYPEPASSATIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypePassation[ lgTYPEPASSATIONID=" + lgTYPEPASSATIONID + " ]";
    }

}
