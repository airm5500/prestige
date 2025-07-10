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
@Table(name = "t_taux_marque")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTauxMarque.findAll", query = "SELECT t FROM TTauxMarque t"),
        @NamedQuery(name = "TTauxMarque.findByLgTAUXMARQUEID", query = "SELECT t FROM TTauxMarque t WHERE t.lgTAUXMARQUEID = :lgTAUXMARQUEID"),
        @NamedQuery(name = "TTauxMarque.findByStrCODE", query = "SELECT t FROM TTauxMarque t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TTauxMarque.findByStrNAME", query = "SELECT t FROM TTauxMarque t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTauxMarque.findByStrSTATUT", query = "SELECT t FROM TTauxMarque t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTauxMarque.findByDtCREATED", query = "SELECT t FROM TTauxMarque t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTauxMarque.findByDtUPDATED", query = "SELECT t FROM TTauxMarque t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTauxMarque implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TAUX_MARQUE_ID", nullable = false, length = 40)
    private String lgTAUXMARQUEID;
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

    public TTauxMarque() {
    }

    public TTauxMarque(String lgTAUXMARQUEID) {
        this.lgTAUXMARQUEID = lgTAUXMARQUEID;
    }

    public String getLgTAUXMARQUEID() {
        return lgTAUXMARQUEID;
    }

    public void setLgTAUXMARQUEID(String lgTAUXMARQUEID) {
        this.lgTAUXMARQUEID = lgTAUXMARQUEID;
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
        hash += (lgTAUXMARQUEID != null ? lgTAUXMARQUEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTauxMarque)) {
            return false;
        }
        TTauxMarque other = (TTauxMarque) object;
        if ((this.lgTAUXMARQUEID == null && other.lgTAUXMARQUEID != null)
                || (this.lgTAUXMARQUEID != null && !this.lgTAUXMARQUEID.equals(other.lgTAUXMARQUEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTauxMarque[ lgTAUXMARQUEID=" + lgTAUXMARQUEID + " ]";
    }

}
