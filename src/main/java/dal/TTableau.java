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
@Table(name = "t_tableau")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTableau.findAll", query = "SELECT t FROM TTableau t"),
        @NamedQuery(name = "TTableau.findByLgTABLEAUID", query = "SELECT t FROM TTableau t WHERE t.lgTABLEAUID = :lgTABLEAUID"),
        @NamedQuery(name = "TTableau.findByStrCODE", query = "SELECT t FROM TTableau t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TTableau.findByStrNAME", query = "SELECT t FROM TTableau t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTableau.findByStrSTATUT", query = "SELECT t FROM TTableau t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTableau.findByDtCREATED", query = "SELECT t FROM TTableau t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTableau.findByDtUPDATED", query = "SELECT t FROM TTableau t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTableau implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TABLEAU_ID", nullable = false, length = 40)
    private String lgTABLEAUID;
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

    public TTableau() {
    }

    public TTableau(String lgTABLEAUID) {
        this.lgTABLEAUID = lgTABLEAUID;
    }

    public String getLgTABLEAUID() {
        return lgTABLEAUID;
    }

    public void setLgTABLEAUID(String lgTABLEAUID) {
        this.lgTABLEAUID = lgTABLEAUID;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTABLEAUID != null ? lgTABLEAUID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTableau)) {
            return false;
        }
        TTableau other = (TTableau) object;
        if ((this.lgTABLEAUID == null && other.lgTABLEAUID != null)
                || (this.lgTABLEAUID != null && !this.lgTABLEAUID.equals(other.lgTABLEAUID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTableau[ lgTABLEAUID=" + lgTABLEAUID + " ]";
    }

}
