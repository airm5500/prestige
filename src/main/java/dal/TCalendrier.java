/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
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
@Table(name = "t_calendrier")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCalendrier.findAll", query = "SELECT t FROM TCalendrier t"),
        @NamedQuery(name = "TCalendrier.findByLgCALENDRIERID", query = "SELECT t FROM TCalendrier t WHERE t.lgCALENDRIERID = :lgCALENDRIERID"),
        @NamedQuery(name = "TCalendrier.findByIntNUMBERJOUR", query = "SELECT t FROM TCalendrier t WHERE t.intNUMBERJOUR = :intNUMBERJOUR"),
        @NamedQuery(name = "TCalendrier.findByIntANNEE", query = "SELECT t FROM TCalendrier t WHERE t.intANNEE = :intANNEE"),
        @NamedQuery(name = "TCalendrier.findByDtCREATED", query = "SELECT t FROM TCalendrier t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCalendrier.findByDtBEGIN", query = "SELECT t FROM TCalendrier t WHERE t.dtBEGIN = :dtBEGIN"),
        @NamedQuery(name = "TCalendrier.findByDtEND", query = "SELECT t FROM TCalendrier t WHERE t.dtEND = :dtEND"),
        @NamedQuery(name = "TCalendrier.findByDtUPDATED", query = "SELECT t FROM TCalendrier t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCalendrier.findByStrSTATUT", query = "SELECT t FROM TCalendrier t WHERE t.strSTATUT = :strSTATUT") })
public class TCalendrier implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CALENDRIER_ID", nullable = false, length = 40)
    private String lgCALENDRIERID;
    @Column(name = "int_NUMBER_JOUR")
    private Integer intNUMBERJOUR;
    @Column(name = "int_ANNEE")
    private Integer intANNEE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_BEGIN")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtBEGIN;
    @Column(name = "dt_END")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtEND;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @JoinColumn(name = "lg_MONTH_ID", referencedColumnName = "lg_MONTH_ID", nullable = false)
    @ManyToOne(optional = false)
    private TMonth lgMONTHID;
    @Column(name = "dt_day")
    private LocalDate dtDay;

    public TCalendrier() {
    }

    public LocalDate getDtDay() {
        return dtDay;
    }

    public void setDtDay(LocalDate dtDay) {
        this.dtDay = dtDay;
    }

    public TCalendrier(String lgCALENDRIERID) {
        this.lgCALENDRIERID = lgCALENDRIERID;
    }

    public String getLgCALENDRIERID() {
        return lgCALENDRIERID;
    }

    public void setLgCALENDRIERID(String lgCALENDRIERID) {
        this.lgCALENDRIERID = lgCALENDRIERID;
    }

    public Integer getIntNUMBERJOUR() {
        return intNUMBERJOUR;
    }

    public void setIntNUMBERJOUR(Integer intNUMBERJOUR) {
        this.intNUMBERJOUR = intNUMBERJOUR;
    }

    public Integer getIntANNEE() {
        return intANNEE;
    }

    public void setIntANNEE(Integer intANNEE) {
        this.intANNEE = intANNEE;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Date getDtBEGIN() {
        return dtBEGIN;
    }

    public void setDtBEGIN(Date dtBEGIN) {
        this.dtBEGIN = dtBEGIN;
    }

    public Date getDtEND() {
        return dtEND;
    }

    public void setDtEND(Date dtEND) {
        this.dtEND = dtEND;
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

    public TMonth getLgMONTHID() {
        return lgMONTHID;
    }

    public void setLgMONTHID(TMonth lgMONTHID) {
        this.lgMONTHID = lgMONTHID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCALENDRIERID != null ? lgCALENDRIERID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCalendrier)) {
            return false;
        }
        TCalendrier other = (TCalendrier) object;
        if ((this.lgCALENDRIERID == null && other.lgCALENDRIERID != null)
                || (this.lgCALENDRIERID != null && !this.lgCALENDRIERID.equals(other.lgCALENDRIERID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCalendrier[ lgCALENDRIERID=" + lgCALENDRIERID + " ]";
    }

}
