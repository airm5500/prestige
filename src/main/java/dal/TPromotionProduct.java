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
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
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
@Table(name = "t_promotion_product")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TPromotionProduct.findAll", query = "SELECT t FROM TPromotionProduct t"),
        @NamedQuery(name = "TPromotionProduct.findByLgCODEPROMOTIONID", query = "SELECT t FROM TPromotionProduct t WHERE t.lgCODEPROMOTIONID.lgCODEPROMOTIONID = :lgCODEPROMOTIONID"),
        @NamedQuery(name = "TPromotionProduct.findByLgPROMOTIONPRODUCTID", query = "SELECT t FROM TPromotionProduct t WHERE t.lgPROMOTIONPRODUCTID = :lgPROMOTIONPRODUCTID"),
        @NamedQuery(name = "TPromotionProduct.findByIntDISCOUNT", query = "SELECT t FROM TPromotionProduct t WHERE t.intDISCOUNT = :intDISCOUNT"),
        @NamedQuery(name = "TPromotionProduct.findByBlMODE", query = "SELECT t FROM TPromotionProduct t WHERE t.blMODE = :blMODE"),
        @NamedQuery(name = "TPromotionProduct.findByIntPACKNUMBER", query = "SELECT t FROM TPromotionProduct t WHERE t.intPACKNUMBER = :intPACKNUMBER"),
        @NamedQuery(name = "TPromotionProduct.findByDbPRICE", query = "SELECT t FROM TPromotionProduct t WHERE t.dbPRICE = :dbPRICE"),
        @NamedQuery(name = "TPromotionProduct.findByIntACTIVEAT", query = "SELECT t FROM TPromotionProduct t WHERE t.intACTIVEAT = :intACTIVEAT"),
        @NamedQuery(name = "TPromotionProduct.findByDtPROMOTEDDATE", query = "SELECT t FROM TPromotionProduct t WHERE t.dtPROMOTEDDATE = :dtPROMOTEDDATE") })
public class TPromotionProduct implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_PROMOTION_PRODUCT_ID", nullable = false)
    private Integer lgPROMOTIONPRODUCTID;
    @Column(name = "int_DISCOUNT")
    private Integer intDISCOUNT;
    @Column(name = "bl_MODE")
    private Boolean blMODE;
    @Column(name = "int_PACK_NUMBER")
    private Integer intPACKNUMBER;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "db_PRICE", precision = 8, scale = 2)
    private Double dbPRICE;
    @Column(name = "int_ACTIVE_AT")
    private Integer intACTIVEAT;
    @Basic(optional = false)
    @Column(name = "dt_PROMOTED_DATE", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPROMOTEDDATE;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_CODE_PROMOTION_ID", referencedColumnName = "lg_CODE_PROMOTION_ID", nullable = false)
    @ManyToOne(optional = false)
    private TPromotion lgCODEPROMOTIONID;

    public TPromotionProduct() {
    }

    public TPromotionProduct(Integer lgPROMOTIONPRODUCTID) {
        this.lgPROMOTIONPRODUCTID = lgPROMOTIONPRODUCTID;
    }

    public TPromotionProduct(Integer lgPROMOTIONPRODUCTID, Date dtPROMOTEDDATE) {
        this.lgPROMOTIONPRODUCTID = lgPROMOTIONPRODUCTID;
        this.dtPROMOTEDDATE = dtPROMOTEDDATE;
    }

    public Integer getLgPROMOTIONPRODUCTID() {
        return lgPROMOTIONPRODUCTID;
    }

    public void setLgPROMOTIONPRODUCTID(Integer lgPROMOTIONPRODUCTID) {
        this.lgPROMOTIONPRODUCTID = lgPROMOTIONPRODUCTID;
    }

    public Integer getIntDISCOUNT() {
        return intDISCOUNT;
    }

    public void setIntDISCOUNT(Integer intDISCOUNT) {
        this.intDISCOUNT = intDISCOUNT;
    }

    public Boolean getBlMODE() {
        return blMODE;
    }

    public void setBlMODE(Boolean blMODE) {
        this.blMODE = blMODE;
    }

    public Integer getIntPACKNUMBER() {
        return intPACKNUMBER;
    }

    public void setIntPACKNUMBER(Integer intPACKNUMBER) {
        this.intPACKNUMBER = intPACKNUMBER;
    }

    public Double getDbPRICE() {
        return dbPRICE;
    }

    public void setDbPRICE(Double dbPRICE) {
        this.dbPRICE = dbPRICE;
    }

    public Integer getIntACTIVEAT() {
        return intACTIVEAT;
    }

    public void setIntACTIVEAT(Integer intACTIVEAT) {
        this.intACTIVEAT = intACTIVEAT;
    }

    public Date getDtPROMOTEDDATE() {
        return dtPROMOTEDDATE;
    }

    public void setDtPROMOTEDDATE(Date dtPROMOTEDDATE) {
        this.dtPROMOTEDDATE = dtPROMOTEDDATE;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TPromotion getLgCODEPROMOTIONID() {
        return lgCODEPROMOTIONID;
    }

    public void setLgCODEPROMOTIONID(TPromotion lgCODEPROMOTIONID) {
        this.lgCODEPROMOTIONID = lgCODEPROMOTIONID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgPROMOTIONPRODUCTID != null ? lgPROMOTIONPRODUCTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPromotionProduct)) {
            return false;
        }
        TPromotionProduct other = (TPromotionProduct) object;
        if ((this.lgPROMOTIONPRODUCTID == null && other.lgPROMOTIONPRODUCTID != null)
                || (this.lgPROMOTIONPRODUCTID != null
                        && !this.lgPROMOTIONPRODUCTID.equals(other.lgPROMOTIONPRODUCTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPromotionProduct[ lgPROMOTIONPRODUCTID=" + lgPROMOTIONPRODUCTID + " ]";
    }

}
