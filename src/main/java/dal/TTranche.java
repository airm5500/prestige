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
@Table(name = "t_tranche")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTranche.findAll", query = "SELECT t FROM TTranche t"),
        @NamedQuery(name = "TTranche.findByLgTRANCHEID", query = "SELECT t FROM TTranche t WHERE t.lgTRANCHEID = :lgTRANCHEID"),
        @NamedQuery(name = "TTranche.findByIntMONTANTMIN", query = "SELECT t FROM TTranche t WHERE t.intMONTANTMIN = :intMONTANTMIN"),
        @NamedQuery(name = "TTranche.findByIntMONTANTMAX", query = "SELECT t FROM TTranche t WHERE t.intMONTANTMAX = :intMONTANTMAX"),
        @NamedQuery(name = "TTranche.findByDblPOURCENTAGETRANCHE", query = "SELECT t FROM TTranche t WHERE t.dblPOURCENTAGETRANCHE = :dblPOURCENTAGETRANCHE"),
        @NamedQuery(name = "TTranche.findByStrSTATUT", query = "SELECT t FROM TTranche t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTranche.findByDtCREATED", query = "SELECT t FROM TTranche t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTranche.findByDtUPDATED", query = "SELECT t FROM TTranche t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTranche implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TRANCHE_ID", nullable = false, length = 40)
    private String lgTRANCHEID;
    @Column(name = "int_MONTANT_MIN")
    private Integer intMONTANTMIN;
    @Column(name = "int_MONTANT_MAX")
    private Integer intMONTANTMAX;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_POURCENTAGE_TRANCHE", precision = 15, scale = 3)
    private Double dblPOURCENTAGETRANCHE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgTRANCHEID")
    private Collection<TEscompteSocieteTranche> tEscompteSocieteTrancheCollection;

    public TTranche() {
    }

    public TTranche(String lgTRANCHEID) {
        this.lgTRANCHEID = lgTRANCHEID;
    }

    public String getLgTRANCHEID() {
        return lgTRANCHEID;
    }

    public void setLgTRANCHEID(String lgTRANCHEID) {
        this.lgTRANCHEID = lgTRANCHEID;
    }

    public Integer getIntMONTANTMIN() {
        return intMONTANTMIN;
    }

    public void setIntMONTANTMIN(Integer intMONTANTMIN) {
        this.intMONTANTMIN = intMONTANTMIN;
    }

    public Integer getIntMONTANTMAX() {
        return intMONTANTMAX;
    }

    public void setIntMONTANTMAX(Integer intMONTANTMAX) {
        this.intMONTANTMAX = intMONTANTMAX;
    }

    public Double getDblPOURCENTAGETRANCHE() {
        return dblPOURCENTAGETRANCHE;
    }

    public void setDblPOURCENTAGETRANCHE(Double dblPOURCENTAGETRANCHE) {
        this.dblPOURCENTAGETRANCHE = dblPOURCENTAGETRANCHE;
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
    public Collection<TEscompteSocieteTranche> getTEscompteSocieteTrancheCollection() {
        return tEscompteSocieteTrancheCollection;
    }

    public void setTEscompteSocieteTrancheCollection(
            Collection<TEscompteSocieteTranche> tEscompteSocieteTrancheCollection) {
        this.tEscompteSocieteTrancheCollection = tEscompteSocieteTrancheCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTRANCHEID != null ? lgTRANCHEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTranche)) {
            return false;
        }
        TTranche other = (TTranche) object;
        if ((this.lgTRANCHEID == null && other.lgTRANCHEID != null)
                || (this.lgTRANCHEID != null && !this.lgTRANCHEID.equals(other.lgTRANCHEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTranche[ lgTRANCHEID=" + lgTRANCHEID + " ]";
    }

}
