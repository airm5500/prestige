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
@Table(name = "t_caisse")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCaisse.findAll", query = "SELECT t FROM TCaisse t"),
        @NamedQuery(name = "TCaisse.findByLgCAISSEID", query = "SELECT t FROM TCaisse t WHERE t.lgCAISSEID = :lgCAISSEID"),
        @NamedQuery(name = "TCaisse.findByIntSOLDE", query = "SELECT t FROM TCaisse t WHERE t.intSOLDE = :intSOLDE"),
        @NamedQuery(name = "TCaisse.findByDtCREATED", query = "SELECT t FROM TCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCaisse.findByDtUPDATED", query = "SELECT t FROM TCaisse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCaisse.findByLgUPDATEDBY", query = "SELECT t FROM TCaisse t WHERE t.lgUPDATEDBY = :lgUPDATEDBY"),
        @NamedQuery(name = "TCaisse.findByLgCREATEDBY", query = "SELECT t FROM TCaisse t WHERE t.lgCREATEDBY = :lgCREATEDBY") })
public class TCaisse implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CAISSE_ID", nullable = false, length = 40)
    private String lgCAISSEID;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_SOLDE", precision = 12, scale = 2)
    private Double intSOLDE;
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
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @OneToMany(mappedBy = "lgCAISSEID")
    private Collection<TSnapShopDalyRecetteCaisse> tSnapShopDalyRecetteCaisseCollection;

    public TCaisse() {
    }

    public TCaisse(String lgCAISSEID) {
        this.lgCAISSEID = lgCAISSEID;
    }

    public String getLgCAISSEID() {
        return lgCAISSEID;
    }

    public void setLgCAISSEID(String lgCAISSEID) {
        this.lgCAISSEID = lgCAISSEID;
    }

    public Double getIntSOLDE() {
        return intSOLDE;
    }

    public void setIntSOLDE(Double intSOLDE) {
        this.intSOLDE = intSOLDE;
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

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @XmlTransient
    public Collection<TSnapShopDalyRecetteCaisse> getTSnapShopDalyRecetteCaisseCollection() {
        return tSnapShopDalyRecetteCaisseCollection;
    }

    public void setTSnapShopDalyRecetteCaisseCollection(
            Collection<TSnapShopDalyRecetteCaisse> tSnapShopDalyRecetteCaisseCollection) {
        this.tSnapShopDalyRecetteCaisseCollection = tSnapShopDalyRecetteCaisseCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCAISSEID != null ? lgCAISSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCaisse)) {
            return false;
        }
        TCaisse other = (TCaisse) object;
        if ((this.lgCAISSEID == null && other.lgCAISSEID != null)
                || (this.lgCAISSEID != null && !this.lgCAISSEID.equals(other.lgCAISSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCaisse[ lgCAISSEID=" + lgCAISSEID + " ]";
    }

}
