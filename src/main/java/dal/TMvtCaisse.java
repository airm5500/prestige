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

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_mvt_caisse")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMvtCaisse.findAll", query = "SELECT t FROM TMvtCaisse t"),
        @NamedQuery(name = "TMvtCaisse.findByLgMVTCAISSEID", query = "SELECT t FROM TMvtCaisse t WHERE t.lgMVTCAISSEID = :lgMVTCAISSEID"),
        @NamedQuery(name = "TMvtCaisse.findByLgUSERID", query = "SELECT t FROM TMvtCaisse t WHERE t.lgUSERID = :lgUSERID"),
        @NamedQuery(name = "TMvtCaisse.findByStrNUMCOMPTE", query = "SELECT t FROM TMvtCaisse t WHERE t.strNUMCOMPTE = :strNUMCOMPTE"),
        @NamedQuery(name = "TMvtCaisse.findByIntAMOUNT", query = "SELECT t FROM TMvtCaisse t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TMvtCaisse.findByDtDATEMVT", query = "SELECT t FROM TMvtCaisse t WHERE t.dtDATEMVT = :dtDATEMVT"),
        @NamedQuery(name = "TMvtCaisse.findByDtCREATED", query = "SELECT t FROM TMvtCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMvtCaisse.findByDtUPDATED", query = "SELECT t FROM TMvtCaisse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMvtCaisse.findByStrUPDATEDBY", query = "SELECT t FROM TMvtCaisse t WHERE t.strUPDATEDBY = :strUPDATEDBY"),
        @NamedQuery(name = "TMvtCaisse.findByStrSTATUT", query = "SELECT t FROM TMvtCaisse t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TMvtCaisse.findByPKey", query = "SELECT t FROM TMvtCaisse t WHERE t.pKey = :pKey"),
        @NamedQuery(name = "TMvtCaisse.findByStrREFTICKET", query = "SELECT t FROM TMvtCaisse t WHERE t.strREFTICKET = :strREFTICKET"),
        @NamedQuery(name = "TMvtCaisse.findByBoolCHECKED", query = "SELECT t FROM TMvtCaisse t WHERE t.boolCHECKED = :boolCHECKED") })
public class TMvtCaisse implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MVT_CAISSE_ID", nullable = false, length = 40)
    private String lgMVTCAISSEID;
    @Column(name = "lg_USER_ID", length = 40)
    private String lgUSERID;
    @Column(name = "str_NUM_COMPTE", length = 100)
    private String strNUMCOMPTE;
    @Column(name = "str_NUM_PIECE_COMPTABLE", length = 100)
    private String strNUMPIECECOMPTABLE;
    @Column(name = "str_COMMENTAIRE", length = 255)
    private String strCOMMENTAIRE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT", precision = 15, scale = 3)
    private Double intAMOUNT;
    @Column(name = "dt_DATE_MVT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATEMVT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_UPDATED_BY", length = 40)
    private String strUPDATEDBY;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "P_KEY", length = 20)
    private String pKey;
    @Column(name = "str_REF_TICKET", length = 10)
    private String strREFTICKET;
    @Column(name = "bool_CHECKED")
    private Boolean boolCHECKED;
    @JoinColumn(name = "str_CREATED_BY", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser strCREATEDBY;
    @JoinColumn(name = "lg_MODE_REGLEMENT_ID", referencedColumnName = "lg_MODE_REGLEMENT_ID")
    @ManyToOne
    private TModeReglement lgMODEREGLEMENTID;
    @JoinColumn(name = "lg_TYPE_MVT_CAISSE_ID", referencedColumnName = "lg_TYPE_MVT_CAISSE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TTypeMvtCaisse lgTYPEMVTCAISSEID;

    public TMvtCaisse() {
    }

    public TMvtCaisse(String lgMVTCAISSEID) {
        this.lgMVTCAISSEID = lgMVTCAISSEID;
    }

    public String getLgMVTCAISSEID() {
        return lgMVTCAISSEID;
    }

    public void setLgMVTCAISSEID(String lgMVTCAISSEID) {
        this.lgMVTCAISSEID = lgMVTCAISSEID;
    }

    public String getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public String getStrNUMCOMPTE() {
        return strNUMCOMPTE;
    }

    public void setStrNUMCOMPTE(String strNUMCOMPTE) {
        this.strNUMCOMPTE = strNUMCOMPTE;
    }

    public String getStrNUMPIECECOMPTABLE() {
        return strNUMPIECECOMPTABLE;
    }

    public void setStrNUMPIECECOMPTABLE(String strNUMPIECECOMPTABLE) {
        this.strNUMPIECECOMPTABLE = strNUMPIECECOMPTABLE;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    public Double getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Double intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
    }

    public Date getDtDATEMVT() {
        return dtDATEMVT;
    }

    public void setDtDATEMVT(Date dtDATEMVT) {
        this.dtDATEMVT = dtDATEMVT;
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

    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public void setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getPKey() {
        return pKey;
    }

    public void setPKey(String pKey) {
        this.pKey = pKey;
    }

    public String getStrREFTICKET() {
        return strREFTICKET;
    }

    public void setStrREFTICKET(String strREFTICKET) {
        this.strREFTICKET = strREFTICKET;
    }

    public Boolean getBoolCHECKED() {
        return boolCHECKED;
    }

    public void setBoolCHECKED(Boolean boolCHECKED) {
        this.boolCHECKED = boolCHECKED;
    }

    public TUser getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public void setStrCREATEDBY(TUser strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
    }

    public TModeReglement getLgMODEREGLEMENTID() {
        return lgMODEREGLEMENTID;
    }

    public void setLgMODEREGLEMENTID(TModeReglement lgMODEREGLEMENTID) {
        this.lgMODEREGLEMENTID = lgMODEREGLEMENTID;
    }

    public TTypeMvtCaisse getLgTYPEMVTCAISSEID() {
        return lgTYPEMVTCAISSEID;
    }

    public void setLgTYPEMVTCAISSEID(TTypeMvtCaisse lgTYPEMVTCAISSEID) {
        this.lgTYPEMVTCAISSEID = lgTYPEMVTCAISSEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMVTCAISSEID != null ? lgMVTCAISSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMvtCaisse)) {
            return false;
        }
        TMvtCaisse other = (TMvtCaisse) object;
        if ((this.lgMVTCAISSEID == null && other.lgMVTCAISSEID != null)
                || (this.lgMVTCAISSEID != null && !this.lgMVTCAISSEID.equals(other.lgMVTCAISSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMvtCaisse[ lgMVTCAISSEID=" + lgMVTCAISSEID + " ]";
    }

}
