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
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
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
@Table(name = "t_compte_client_tiers_payant")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TCompteClientTiersPayant.findAll", query = "SELECT t FROM TCompteClientTiersPayant t"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByLgCOMPTECLIENTTIERSPAYANTID", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTTIERSPAYANTID = :lgCOMPTECLIENTTIERSPAYANTID"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByDtCREATED", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByDtUPDATED", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByStrSTATUT", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByIntPOURCENTAGE", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.intPOURCENTAGE = :intPOURCENTAGE"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByIntPRIORITY", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.intPRIORITY = :intPRIORITY"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByBISRO", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.bISRO = :bISRO"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByBISRC1", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.bISRC1 = :bISRC1"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByBISRC2", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.bISRC2 = :bISRC2"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByDblPLAFOND", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.dblPLAFOND = :dblPLAFOND"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByDblQUOTACONSOMENSUELLE", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.dblQUOTACONSOMENSUELLE = :dblQUOTACONSOMENSUELLE"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByDblQUOTACONSOVENTE", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.dblQUOTACONSOVENTE = :dblQUOTACONSOVENTE"),
        @NamedQuery(name = "TCompteClientTiersPayant.findByStrNUMEROSECURITESOCIAL", query = "SELECT t FROM TCompteClientTiersPayant t WHERE t.strNUMEROSECURITESOCIAL = :strNUMEROSECURITESOCIAL") })
public class TCompteClientTiersPayant implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_COMPTE_CLIENT_TIERS_PAYANT_ID", nullable = false, length = 40)
    private String lgCOMPTECLIENTTIERSPAYANTID;
    @Column(name = "b_CANBEUSE")
    private Boolean bCANBEUSE;
    @Column(name = "dbl_QUOTA_CONSO_MENSUELLE")
    private Integer dblQUOTACONSOMENSUELLE;
    @Column(name = "db_CONSOMMATION_MENSUELLE")
    private Integer dbCONSOMMATIONMENSUELLE;
    @Column(name = "db_PLAFOND_ENCOURS")
    private Integer dbPLAFONDENCOURS;
    @Column(name = "isCapped")
    private Boolean isCapped;
    @Column(name = "b_IsAbsolute")
    private Boolean bIsAbsolute;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "int_POURCENTAGE")
    private Integer intPOURCENTAGE;
    @Column(name = "int_PRIORITY")
    private Integer intPRIORITY;
    @Column(name = "b_IS_RO")
    private Boolean bISRO = Boolean.FALSE;
    @Column(name = "b_IS_RC1")
    private Boolean bISRC1;
    @Column(name = "b_IS_RC2")
    private Boolean bISRC2;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_PLAFOND", precision = 12, scale = 2)
    private Double dblPLAFOND;
    @Column(name = "dbl_QUOTA_CONSO_VENTE", precision = 12, scale = 2)
    private Double dblQUOTACONSOVENTE;
    @Column(name = "str_NUMERO_SECURITE_SOCIAL", length = 50)
    private String strNUMEROSECURITESOCIAL;

    @JoinColumn(name = "lg_COMPTE_CLIENT_ID", referencedColumnName = "lg_COMPTE_CLIENT_ID")
    @ManyToOne
    // @Basic(optional = false)
    private TCompteClient lgCOMPTECLIENTID;
    @JoinColumn(name = "lg_TIERS_PAYANT_ID", referencedColumnName = "lg_TIERS_PAYANT_ID")
    @ManyToOne
    private TTiersPayant lgTIERSPAYANTID;

    public Boolean getIsCapped() {
        return isCapped;
    }

    public void setIsCapped(Boolean isCapped) {
        this.isCapped = isCapped;
    }

    public TCompteClientTiersPayant() {
    }

    public TCompteClientTiersPayant(String lgCOMPTECLIENTTIERSPAYANTID) {
        this.lgCOMPTECLIENTTIERSPAYANTID = lgCOMPTECLIENTTIERSPAYANTID;
    }

    public String getLgCOMPTECLIENTTIERSPAYANTID() {
        return lgCOMPTECLIENTTIERSPAYANTID;
    }

    public void setLgCOMPTECLIENTTIERSPAYANTID(String lgCOMPTECLIENTTIERSPAYANTID) {
        this.lgCOMPTECLIENTTIERSPAYANTID = lgCOMPTECLIENTTIERSPAYANTID;
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

    public Integer getIntPOURCENTAGE() {
        return intPOURCENTAGE;
    }

    public void setIntPOURCENTAGE(Integer intPOURCENTAGE) {
        this.intPOURCENTAGE = intPOURCENTAGE;
    }

    public Integer getIntPRIORITY() {
        return intPRIORITY;
    }

    public void setIntPRIORITY(Integer intPRIORITY) {
        this.intPRIORITY = intPRIORITY;
    }

    public Boolean getBISRO() {
        return bISRO;
    }

    public void setBISRO(Boolean bISRO) {
        this.bISRO = bISRO;
    }

    public Boolean getBISRC1() {
        return bISRC1;
    }

    public void setBISRC1(Boolean bISRC1) {
        this.bISRC1 = bISRC1;
    }

    public Boolean getBISRC2() {
        return bISRC2;
    }

    public void setBISRC2(Boolean bISRC2) {
        this.bISRC2 = bISRC2;
    }

    public Double getDblPLAFOND() {
        return dblPLAFOND;
    }

    public void setDblPLAFOND(Double dblPLAFOND) {
        this.dblPLAFOND = dblPLAFOND;
    }

    public Double getDblQUOTACONSOVENTE() {
        return dblQUOTACONSOVENTE;
    }

    public void setDblQUOTACONSOVENTE(Double dblQUOTACONSOVENTE) {
        this.dblQUOTACONSOVENTE = dblQUOTACONSOVENTE;
    }

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    @XmlTransient

    public TCompteClient getLgCOMPTECLIENTID() {
        return lgCOMPTECLIENTID;
    }

    public void setLgCOMPTECLIENTID(TCompteClient lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    public TTiersPayant getLgTIERSPAYANTID() {
        return lgTIERSPAYANTID;
    }

    public void setLgTIERSPAYANTID(TTiersPayant lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCOMPTECLIENTTIERSPAYANTID != null ? lgCOMPTECLIENTTIERSPAYANTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCompteClientTiersPayant)) {
            return false;
        }
        TCompteClientTiersPayant other = (TCompteClientTiersPayant) object;
        if ((this.lgCOMPTECLIENTTIERSPAYANTID == null && other.lgCOMPTECLIENTTIERSPAYANTID != null)
                || (this.lgCOMPTECLIENTTIERSPAYANTID != null
                        && !this.lgCOMPTECLIENTTIERSPAYANTID.equals(other.lgCOMPTECLIENTTIERSPAYANTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCompteClientTiersPayant[ lgCOMPTECLIENTTIERSPAYANTID=" + lgCOMPTECLIENTTIERSPAYANTID + " ]";
    }

    public void setDblQUOTACONSOMENSUELLE(Integer dblQUOTACONSOMENSUELLE) {
        this.dblQUOTACONSOMENSUELLE = dblQUOTACONSOMENSUELLE;
    }

    public Integer getDblQUOTACONSOMENSUELLE() {
        return dblQUOTACONSOMENSUELLE;
    }

    public Integer getDbCONSOMMATIONMENSUELLE() {
        return dbCONSOMMATIONMENSUELLE;
    }

    public void setDbCONSOMMATIONMENSUELLE(Integer dbCONSOMMATIONMENSUELLE) {
        this.dbCONSOMMATIONMENSUELLE = dbCONSOMMATIONMENSUELLE;
    }

    public Integer getDbPLAFONDENCOURS() {
        return dbPLAFONDENCOURS;
    }

    public void setDbPLAFONDENCOURS(Integer dbPLAFONDENCOURS) {
        this.dbPLAFONDENCOURS = dbPLAFONDENCOURS;
    }

    public Boolean getBIsAbsolute() {
        return bIsAbsolute;
    }

    public void setBIsAbsolute(Boolean bIsAbsolute) {
        this.bIsAbsolute = bIsAbsolute;
    }

    public Boolean getBCANBEUSE() {
        return bCANBEUSE;
    }

    public void setBCANBEUSE(Boolean bCANBEUSE) {
        this.bCANBEUSE = bCANBEUSE;
    }

}
