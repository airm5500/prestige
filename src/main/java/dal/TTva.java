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
@Table(name = "t_tva")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTva.findAll", query = "SELECT t FROM TTva t"),
        @NamedQuery(name = "TTva.findByLgTVAID", query = "SELECT t FROM TTva t WHERE t.lgTVAID = :lgTVAID"),
        @NamedQuery(name = "TTva.findByStrLIBELLE", query = "SELECT t FROM TTva t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TTva.findByDblTAUX", query = "SELECT t FROM TTva t WHERE t.dblTAUX = :dblTAUX"),
        @NamedQuery(name = "TTva.findByDtCREATED", query = "SELECT t FROM TTva t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTva.findByDtUPDATED", query = "SELECT t FROM TTva t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTva.findByStrSTATUT", query = "SELECT t FROM TTva t WHERE t.strSTATUT = :strSTATUT") })
public class TTva implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TVA_ID", nullable = false, length = 40)
    private String lgTVAID;
    @Column(name = "str_LIBELLE", length = 40)
    private String strLIBELLE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_TAUX", precision = 15, scale = 3)
    private Double dblTAUX;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;

    public TTva() {
    }

    public TTva(String lgTVAID) {
        this.lgTVAID = lgTVAID;
    }

    public String getLgTVAID() {
        return lgTVAID;
    }

    public void setLgTVAID(String lgTVAID) {
        this.lgTVAID = lgTVAID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public Double getDblTAUX() {
        return dblTAUX;
    }

    public void setDblTAUX(Double dblTAUX) {
        this.dblTAUX = dblTAUX;
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
        hash += (lgTVAID != null ? lgTVAID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTva)) {
            return false;
        }
        TTva other = (TTva) object;
        if ((this.lgTVAID == null && other.lgTVAID != null)
                || (this.lgTVAID != null && !this.lgTVAID.equals(other.lgTVAID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTva[ lgTVAID=" + lgTVAID + " ]";
    }

}
