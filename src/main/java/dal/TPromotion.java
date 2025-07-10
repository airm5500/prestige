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
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
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
@Table(name = "t_promotion")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TPromotion.findAll", query = "SELECT t FROM TPromotion t"),
        @NamedQuery(name = "TPromotion.findByLgCODEPROMOTIONID", query = "SELECT t FROM TPromotion t WHERE t.lgCODEPROMOTIONID = :lgCODEPROMOTIONID"),
        @NamedQuery(name = "TPromotion.findByDtSTARTDATE", query = "SELECT t FROM TPromotion t WHERE t.dtSTARTDATE = :dtSTARTDATE"),
        @NamedQuery(name = "TPromotion.findByDtENDDATE", query = "SELECT t FROM TPromotion t WHERE t.dtENDDATE = :dtENDDATE"),
        @NamedQuery(name = "TPromotion.findByStrTYPE", query = "SELECT t FROM TPromotion t WHERE t.strTYPE = :strTYPE") })
public class TPromotion implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_CODE_PROMOTION_ID", nullable = false)
    private Integer lgCODEPROMOTIONID;
    @Basic(optional = false)
    @Column(name = "dt_START_DATE", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtSTARTDATE;
    @Basic(optional = false)
    @Column(name = "dt_END_DATE", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtENDDATE;
    @Column(name = "str_TYPE", length = 40)
    private String strTYPE;
    @OneToMany(mappedBy = "lgCODEPROMOTIONID")
    private Collection<TPromotionProduct> tPromotionProductCollection;

    public TPromotion() {
    }

    public TPromotion(Integer lgCODEPROMOTIONID) {
        this.lgCODEPROMOTIONID = lgCODEPROMOTIONID;
    }

    public TPromotion(Integer lgCODEPROMOTIONID, Date dtSTARTDATE, Date dtENDDATE) {
        this.lgCODEPROMOTIONID = lgCODEPROMOTIONID;
        this.dtSTARTDATE = dtSTARTDATE;
        this.dtENDDATE = dtENDDATE;
    }

    public Integer getLgCODEPROMOTIONID() {
        return lgCODEPROMOTIONID;
    }

    public void setLgCODEPROMOTIONID(Integer lgCODEPROMOTIONID) {
        this.lgCODEPROMOTIONID = lgCODEPROMOTIONID;
    }

    public Date getDtSTARTDATE() {
        return dtSTARTDATE;
    }

    public void setDtSTARTDATE(Date dtSTARTDATE) {
        this.dtSTARTDATE = dtSTARTDATE;
    }

    public Date getDtENDDATE() {
        return dtENDDATE;
    }

    public void setDtENDDATE(Date dtENDDATE) {
        this.dtENDDATE = dtENDDATE;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    @XmlTransient
    public Collection<TPromotionProduct> getTPromotionProductCollection() {
        return tPromotionProductCollection;
    }

    public void setTPromotionProductCollection(Collection<TPromotionProduct> tPromotionProductCollection) {
        this.tPromotionProductCollection = tPromotionProductCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCODEPROMOTIONID != null ? lgCODEPROMOTIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPromotion)) {
            return false;
        }
        TPromotion other = (TPromotion) object;
        if ((this.lgCODEPROMOTIONID == null && other.lgCODEPROMOTIONID != null)
                || (this.lgCODEPROMOTIONID != null && !this.lgCODEPROMOTIONID.equals(other.lgCODEPROMOTIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPromotion[ lgCODEPROMOTIONID=" + lgCODEPROMOTIONID + " ]";
    }

}
