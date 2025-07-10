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
@Table(name = "t_promotion_history")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TPromotionHistory.findAll", query = "SELECT t FROM TPromotionHistory t"),
        @NamedQuery(name = "TPromotionHistory.findByLgCODEPROMOTIONHISTORY", query = "SELECT t FROM TPromotionHistory t WHERE t.lgCODEPROMOTIONHISTORY = :lgCODEPROMOTIONHISTORY"),
        @NamedQuery(name = "TPromotionHistory.findByLgCODEPROMOTIONID", query = "SELECT t FROM TPromotionHistory t WHERE t.lgCODEPROMOTIONID = :lgCODEPROMOTIONID"),
        @NamedQuery(name = "TPromotionHistory.findByIntCIP", query = "SELECT t FROM TPromotionHistory t WHERE t.intCIP = :intCIP"),
        @NamedQuery(name = "TPromotionHistory.findByLgFAMILLEID", query = "SELECT t FROM TPromotionHistory t WHERE t.lgFAMILLEID = :lgFAMILLEID"),
        @NamedQuery(name = "TPromotionHistory.findByStrNAME", query = "SELECT t FROM TPromotionHistory t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TPromotionHistory.findByDtPROMOTEDDATE", query = "SELECT t FROM TPromotionHistory t WHERE t.dtPROMOTEDDATE = :dtPROMOTEDDATE"),
        @NamedQuery(name = "TPromotionHistory.findByDtSTARTDATE", query = "SELECT t FROM TPromotionHistory t WHERE t.dtSTARTDATE = :dtSTARTDATE"),
        @NamedQuery(name = "TPromotionHistory.findByDtENDDATE", query = "SELECT t FROM TPromotionHistory t WHERE t.dtENDDATE = :dtENDDATE"),
        @NamedQuery(name = "TPromotionHistory.findByStrTYPE", query = "SELECT t FROM TPromotionHistory t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TPromotionHistory.findByIntDISCOUNT", query = "SELECT t FROM TPromotionHistory t WHERE t.intDISCOUNT = :intDISCOUNT"),
        @NamedQuery(name = "TPromotionHistory.findByBlMODE", query = "SELECT t FROM TPromotionHistory t WHERE t.blMODE = :blMODE"),
        @NamedQuery(name = "TPromotionHistory.findByIntPACKNUMBER", query = "SELECT t FROM TPromotionHistory t WHERE t.intPACKNUMBER = :intPACKNUMBER"),
        @NamedQuery(name = "TPromotionHistory.findByIntACTIVEAT", query = "SELECT t FROM TPromotionHistory t WHERE t.intACTIVEAT = :intACTIVEAT"),
        @NamedQuery(name = "TPromotionHistory.findByDbPRICE", query = "SELECT t FROM TPromotionHistory t WHERE t.dbPRICE = :dbPRICE") })
public class TPromotionHistory implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_CODE_PROMOTION_HISTORY", nullable = false)
    private Integer lgCODEPROMOTIONHISTORY;
    @Basic(optional = false)
    @Column(name = "lg_CODE_PROMOTION_ID", nullable = false)
    private int lgCODEPROMOTIONID;
    @Basic(optional = false)
    @Column(name = "int_CIP", nullable = false, length = 20)
    private String intCIP;
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_ID", nullable = false, length = 40)
    private String lgFAMILLEID;
    @Column(name = "str_NAME", length = 60)
    private String strNAME;
    @Basic(optional = false)
    @Column(name = "dt_PROMOTED_DATE", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPROMOTEDDATE;
    @Column(name = "dt_START_DATE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtSTARTDATE;
    @Column(name = "dt_END_DATE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtENDDATE;
    @Column(name = "str_TYPE", length = 40)
    private String strTYPE;
    @Column(name = "int_DISCOUNT")
    private Integer intDISCOUNT;
    @Column(name = "bl_MODE")
    private Boolean blMODE;
    @Column(name = "int_PACK_NUMBER")
    private Integer intPACKNUMBER;
    @Column(name = "int_ACTIVE_AT")
    private Integer intACTIVEAT;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "db_PRICE", precision = 22)
    private Double dbPRICE;

    public TPromotionHistory() {
    }

    public TPromotionHistory(Integer lgCODEPROMOTIONHISTORY) {
        this.lgCODEPROMOTIONHISTORY = lgCODEPROMOTIONHISTORY;
    }

    public TPromotionHistory(Integer lgCODEPROMOTIONHISTORY, int lgCODEPROMOTIONID, String intCIP, String lgFAMILLEID,
            Date dtPROMOTEDDATE) {
        this.lgCODEPROMOTIONHISTORY = lgCODEPROMOTIONHISTORY;
        this.lgCODEPROMOTIONID = lgCODEPROMOTIONID;
        this.intCIP = intCIP;
        this.lgFAMILLEID = lgFAMILLEID;
        this.dtPROMOTEDDATE = dtPROMOTEDDATE;
    }

    public Integer getLgCODEPROMOTIONHISTORY() {
        return lgCODEPROMOTIONHISTORY;
    }

    public void setLgCODEPROMOTIONHISTORY(Integer lgCODEPROMOTIONHISTORY) {
        this.lgCODEPROMOTIONHISTORY = lgCODEPROMOTIONHISTORY;
    }

    public int getLgCODEPROMOTIONID() {
        return lgCODEPROMOTIONID;
    }

    public void setLgCODEPROMOTIONID(int lgCODEPROMOTIONID) {
        this.lgCODEPROMOTIONID = lgCODEPROMOTIONID;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public Date getDtPROMOTEDDATE() {
        return dtPROMOTEDDATE;
    }

    public void setDtPROMOTEDDATE(Date dtPROMOTEDDATE) {
        this.dtPROMOTEDDATE = dtPROMOTEDDATE;
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

    public Integer getIntACTIVEAT() {
        return intACTIVEAT;
    }

    public void setIntACTIVEAT(Integer intACTIVEAT) {
        this.intACTIVEAT = intACTIVEAT;
    }

    public Double getDbPRICE() {
        return dbPRICE;
    }

    public void setDbPRICE(Double dbPRICE) {
        this.dbPRICE = dbPRICE;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCODEPROMOTIONHISTORY != null ? lgCODEPROMOTIONHISTORY.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPromotionHistory)) {
            return false;
        }
        TPromotionHistory other = (TPromotionHistory) object;
        if ((this.lgCODEPROMOTIONHISTORY == null && other.lgCODEPROMOTIONHISTORY != null)
                || (this.lgCODEPROMOTIONHISTORY != null
                        && !this.lgCODEPROMOTIONHISTORY.equals(other.lgCODEPROMOTIONHISTORY))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPromotionHistory[ lgCODEPROMOTIONHISTORY=" + lgCODEPROMOTIONHISTORY + " ]";
    }

}
