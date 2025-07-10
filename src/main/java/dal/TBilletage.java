/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
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
@Table(name = "t_billetage")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TBilletage.findAll", query = "SELECT t FROM TBilletage t"),
        @NamedQuery(name = "TBilletage.findByLgBILLETAGEID", query = "SELECT t FROM TBilletage t WHERE t.lgBILLETAGEID = :lgBILLETAGEID"),
        @NamedQuery(name = "TBilletage.findByLdCAISSEID", query = "SELECT t FROM TBilletage t WHERE t.ldCAISSEID = :ldCAISSEID"),
        @NamedQuery(name = "TBilletage.findByIntAMOUNT", query = "SELECT t FROM TBilletage t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TBilletage.findByDtCREATED", query = "SELECT t FROM TBilletage t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TBilletage.findByDtUPDATED", query = "SELECT t FROM TBilletage t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TBilletage.findByLgUPDATEDBY", query = "SELECT t FROM TBilletage t WHERE t.lgUPDATEDBY = :lgUPDATEDBY"),
        @NamedQuery(name = "TBilletage.findByLgCREATEDBY", query = "SELECT t FROM TBilletage t WHERE t.lgCREATEDBY = :lgCREATEDBY") })
public class TBilletage implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_BILLETAGE_ID", nullable = false, length = 40)
    private String lgBILLETAGEID;
    @Basic(optional = false)
    @Column(name = "ld_CAISSE_ID", nullable = false, length = 40)
    private String ldCAISSEID;
    @Column(name = "int_AMOUNT", precision = 12, scale = 2)
    private Double intAMOUNT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "lg_UPDATED_BY", length = 20)
    private String lgUPDATEDBY;
    @Column(name = "lg_CREATED_BY", length = 20)
    private String lgCREATEDBY;
    @OneToMany(mappedBy = "lgBILLETAGEID")
    private Collection<TBilletageDetails> tBilletageDetailsCollection = new ArrayList<>();
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TBilletage() {
    }

    public TBilletage(String lgBILLETAGEID) {

        this.lgBILLETAGEID = lgBILLETAGEID;
    }

    public TBilletage(String lgBILLETAGEID, String ldCAISSEID) {
        this.lgBILLETAGEID = lgBILLETAGEID;
        this.ldCAISSEID = ldCAISSEID;
    }

    public String getLgBILLETAGEID() {
        return lgBILLETAGEID;
    }

    public void setLgBILLETAGEID(String lgBILLETAGEID) {
        this.lgBILLETAGEID = lgBILLETAGEID;
    }

    public String getLdCAISSEID() {
        return ldCAISSEID;
    }

    public void setLdCAISSEID(String ldCAISSEID) {
        this.ldCAISSEID = ldCAISSEID;
    }

    public Double getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Double intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
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

    public String getLgUPDATEDBY() {
        return lgUPDATEDBY;
    }

    public void setLgUPDATEDBY(String lgUPDATEDBY) {
        this.lgUPDATEDBY = lgUPDATEDBY;
    }

    public String getLgCREATEDBY() {
        return lgCREATEDBY;
    }

    public void setLgCREATEDBY(String lgCREATEDBY) {
        this.lgCREATEDBY = lgCREATEDBY;
    }

    @XmlTransient
    public Collection<TBilletageDetails> getTBilletageDetailsCollection() {
        return tBilletageDetailsCollection;
    }

    public void setTBilletageDetailsCollection(Collection<TBilletageDetails> tBilletageDetailsCollection) {
        this.tBilletageDetailsCollection = tBilletageDetailsCollection;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgBILLETAGEID != null ? lgBILLETAGEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {

        if (!(object instanceof TBilletage)) {
            return false;
        }
        TBilletage other = (TBilletage) object;
        if ((this.lgBILLETAGEID == null && other.lgBILLETAGEID != null)
                || (this.lgBILLETAGEID != null && !this.lgBILLETAGEID.equals(other.lgBILLETAGEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TBilletage[ lgBILLETAGEID=" + lgBILLETAGEID + " ]";
    }

}
