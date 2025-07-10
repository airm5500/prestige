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
@Table(name = "t_devise")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TDevise.findAll", query = "SELECT t FROM TDevise t"),
        @NamedQuery(name = "TDevise.findByLgDEVISEID", query = "SELECT t FROM TDevise t WHERE t.lgDEVISEID = :lgDEVISEID"),
        @NamedQuery(name = "TDevise.findByStrNAME", query = "SELECT t FROM TDevise t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TDevise.findByStrDESCRIPTION", query = "SELECT t FROM TDevise t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TDevise.findByIntTAUX", query = "SELECT t FROM TDevise t WHERE t.intTAUX = :intTAUX"),
        @NamedQuery(name = "TDevise.findByStrSTATUT", query = "SELECT t FROM TDevise t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TDevise.findByDtCREATED", query = "SELECT t FROM TDevise t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TDevise.findByDtUPDATED", query = "SELECT t FROM TDevise t WHERE t.dtUPDATED = :dtUPDATED") })
public class TDevise implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DEVISE_ID", nullable = false, length = 40)
    private String lgDEVISEID;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 40)
    private String strDESCRIPTION;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_TAUX", precision = 22)
    private Double intTAUX;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TDevise() {
    }

    public TDevise(String lgDEVISEID) {
        this.lgDEVISEID = lgDEVISEID;
    }

    public String getLgDEVISEID() {
        return lgDEVISEID;
    }

    public void setLgDEVISEID(String lgDEVISEID) {
        this.lgDEVISEID = lgDEVISEID;
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

    public Double getIntTAUX() {
        return intTAUX;
    }

    public void setIntTAUX(Double intTAUX) {
        this.intTAUX = intTAUX;
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
        hash += (lgDEVISEID != null ? lgDEVISEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDevise)) {
            return false;
        }
        TDevise other = (TDevise) object;
        if ((this.lgDEVISEID == null && other.lgDEVISEID != null)
                || (this.lgDEVISEID != null && !this.lgDEVISEID.equals(other.lgDEVISEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDevise[ lgDEVISEID=" + lgDEVISEID + " ]";
    }

}
