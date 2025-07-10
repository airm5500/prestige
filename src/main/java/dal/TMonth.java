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
import javax.persistence.CascadeType;
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
@Table(name = "t_month")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMonth.findAll", query = "SELECT t FROM TMonth t"),
        @NamedQuery(name = "TMonth.findByLgMONTHID", query = "SELECT t FROM TMonth t WHERE t.lgMONTHID = :lgMONTHID"),
        @NamedQuery(name = "TMonth.findByStrNAME", query = "SELECT t FROM TMonth t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TMonth.findByIntMOIS", query = "SELECT t FROM TMonth t WHERE t.intMOIS = :intMOIS"),
        @NamedQuery(name = "TMonth.findByDtCREATED", query = "SELECT t FROM TMonth t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMonth.findByDtUPDATED", query = "SELECT t FROM TMonth t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMonth.findByStrSTATUT", query = "SELECT t FROM TMonth t WHERE t.strSTATUT = :strSTATUT") })
public class TMonth implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MONTH_ID", nullable = false, length = 40)
    private String lgMONTHID;
    @Basic(optional = false)
    @Column(name = "str_NAME", nullable = false, length = 40)
    private String strNAME;
    @Column(name = "int_MOIS")
    private Integer intMOIS;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgMONTHID")
    private Collection<TCalendrier> tCalendrierCollection;

    public TMonth() {
    }

    public TMonth(String lgMONTHID) {
        this.lgMONTHID = lgMONTHID;
    }

    public TMonth(String lgMONTHID, String strNAME) {
        this.lgMONTHID = lgMONTHID;
        this.strNAME = strNAME;
    }

    public String getLgMONTHID() {
        return lgMONTHID;
    }

    public void setLgMONTHID(String lgMONTHID) {
        this.lgMONTHID = lgMONTHID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public Integer getIntMOIS() {
        return intMOIS;
    }

    public void setIntMOIS(Integer intMOIS) {
        this.intMOIS = intMOIS;
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
    public Collection<TCalendrier> getTCalendrierCollection() {
        return tCalendrierCollection;
    }

    public void setTCalendrierCollection(Collection<TCalendrier> tCalendrierCollection) {
        this.tCalendrierCollection = tCalendrierCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMONTHID != null ? lgMONTHID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMonth)) {
            return false;
        }
        TMonth other = (TMonth) object;
        if ((this.lgMONTHID == null && other.lgMONTHID != null)
                || (this.lgMONTHID != null && !this.lgMONTHID.equals(other.lgMONTHID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMonth[ lgMONTHID=" + lgMONTHID + " ]";
    }

}
