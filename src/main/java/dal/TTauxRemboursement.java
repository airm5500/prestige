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
@Table(name = "t_taux_remboursement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTauxRemboursement.findAll", query = "SELECT t FROM TTauxRemboursement t"),
        @NamedQuery(name = "TTauxRemboursement.findByLgTAUXREMBOURID", query = "SELECT t FROM TTauxRemboursement t WHERE t.lgTAUXREMBOURID = :lgTAUXREMBOURID"),
        @NamedQuery(name = "TTauxRemboursement.findByStrCODEREMB", query = "SELECT t FROM TTauxRemboursement t WHERE t.strCODEREMB = :strCODEREMB"),
        @NamedQuery(name = "TTauxRemboursement.findByStrLIBELLEE", query = "SELECT t FROM TTauxRemboursement t WHERE t.strLIBELLEE = :strLIBELLEE"),
        @NamedQuery(name = "TTauxRemboursement.findByDtCREATED", query = "SELECT t FROM TTauxRemboursement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTauxRemboursement.findByDtUPDATED", query = "SELECT t FROM TTauxRemboursement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTauxRemboursement.findByStrSTATUT", query = "SELECT t FROM TTauxRemboursement t WHERE t.strSTATUT = :strSTATUT") })
public class TTauxRemboursement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TAUX_REMBOUR_ID", nullable = false, length = 40)
    private String lgTAUXREMBOURID;
    @Column(name = "str_CODE_REMB")
    private Integer strCODEREMB;
    @Column(name = "str_LIBELLEE", length = 40)
    private String strLIBELLEE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;

    public TTauxRemboursement() {
    }

    public TTauxRemboursement(String lgTAUXREMBOURID) {
        this.lgTAUXREMBOURID = lgTAUXREMBOURID;
    }

    public String getLgTAUXREMBOURID() {
        return lgTAUXREMBOURID;
    }

    public void setLgTAUXREMBOURID(String lgTAUXREMBOURID) {
        this.lgTAUXREMBOURID = lgTAUXREMBOURID;
    }

    public Integer getStrCODEREMB() {
        return strCODEREMB;
    }

    public void setStrCODEREMB(Integer strCODEREMB) {
        this.strCODEREMB = strCODEREMB;
    }

    public String getStrLIBELLEE() {
        return strLIBELLEE;
    }

    public void setStrLIBELLEE(String strLIBELLEE) {
        this.strLIBELLEE = strLIBELLEE;
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
        hash += (lgTAUXREMBOURID != null ? lgTAUXREMBOURID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTauxRemboursement)) {
            return false;
        }
        TTauxRemboursement other = (TTauxRemboursement) object;
        if ((this.lgTAUXREMBOURID == null && other.lgTAUXREMBOURID != null)
                || (this.lgTAUXREMBOURID != null && !this.lgTAUXREMBOURID.equals(other.lgTAUXREMBOURID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTauxRemboursement[ lgTAUXREMBOURID=" + lgTAUXREMBOURID + " ]";
    }

}
