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
@Table(name = "t_snap_shop_daly_recette_caisse")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findAll", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByLgID", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByIntAMOUNT", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByIntAMOUNTREMISE", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.intAMOUNTREMISE = :intAMOUNTREMISE"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByDtDAY", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByDtCREATED", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByDtUPDATED", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByStrSTATUT", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByIntNUMBERVO", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.intNUMBERVO = :intNUMBERVO"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByIntNUMBERVNO", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.intNUMBERVNO = :intNUMBERVNO"),
        @NamedQuery(name = "TSnapShopDalyRecetteCaisse.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION") })
public class TSnapShopDalyRecetteCaisse implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false, length = 50)
    private String lgID;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT", precision = 15, scale = 3)
    private Double intAMOUNT;
    @Column(name = "int_AMOUNT_REMISE", precision = 15, scale = 3)
    private Double intAMOUNTREMISE;
    @Column(name = "dt_DAY")
    @Temporal(TemporalType.DATE)
    private Date dtDAY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "int_NUMBER_VO")
    private Integer intNUMBERVO;
    @Column(name = "int_NUMBER_VNO")
    private Integer intNUMBERVNO;
    @Column(name = "int_NUMBER_TRANSACTION")
    private Integer intNUMBERTRANSACTION;
    @JoinColumn(name = "lg_TYPE_VENTE_ID", referencedColumnName = "lg_TYPE_VENTE_ID")
    @ManyToOne
    private TTypeVente lgTYPEVENTEID;
    @JoinColumn(name = "lg_CAISSE_ID", referencedColumnName = "lg_CAISSE_ID")
    @ManyToOne
    private TCaisse lgCAISSEID;
    @JoinColumn(name = "lg_TYPE_RECETTE_ID", referencedColumnName = "lg_TYPE_RECETTE_ID")
    @ManyToOne
    private TTypeRecette lgTYPERECETTEID;

    public TSnapShopDalyRecetteCaisse() {
    }

    public TSnapShopDalyRecetteCaisse(String lgID) {
        this.lgID = lgID;
    }

    public String getLgID() {
        return lgID;
    }

    public void setLgID(String lgID) {
        this.lgID = lgID;
    }

    public Double getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Double intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
    }

    public Double getIntAMOUNTREMISE() {
        return intAMOUNTREMISE;
    }

    public void setIntAMOUNTREMISE(Double intAMOUNTREMISE) {
        this.intAMOUNTREMISE = intAMOUNTREMISE;
    }

    public Date getDtDAY() {
        return dtDAY;
    }

    public void setDtDAY(Date dtDAY) {
        this.dtDAY = dtDAY;
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

    public Integer getIntNUMBERVO() {
        return intNUMBERVO;
    }

    public void setIntNUMBERVO(Integer intNUMBERVO) {
        this.intNUMBERVO = intNUMBERVO;
    }

    public Integer getIntNUMBERVNO() {
        return intNUMBERVNO;
    }

    public void setIntNUMBERVNO(Integer intNUMBERVNO) {
        this.intNUMBERVNO = intNUMBERVNO;
    }

    public Integer getIntNUMBERTRANSACTION() {
        return intNUMBERTRANSACTION;
    }

    public void setIntNUMBERTRANSACTION(Integer intNUMBERTRANSACTION) {
        this.intNUMBERTRANSACTION = intNUMBERTRANSACTION;
    }

    public TTypeVente getLgTYPEVENTEID() {
        return lgTYPEVENTEID;
    }

    public void setLgTYPEVENTEID(TTypeVente lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
    }

    public TCaisse getLgCAISSEID() {
        return lgCAISSEID;
    }

    public void setLgCAISSEID(TCaisse lgCAISSEID) {
        this.lgCAISSEID = lgCAISSEID;
    }

    public TTypeRecette getLgTYPERECETTEID() {
        return lgTYPERECETTEID;
    }

    public void setLgTYPERECETTEID(TTypeRecette lgTYPERECETTEID) {
        this.lgTYPERECETTEID = lgTYPERECETTEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgID != null ? lgID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSnapShopDalyRecetteCaisse)) {
            return false;
        }
        TSnapShopDalyRecetteCaisse other = (TSnapShopDalyRecetteCaisse) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopDalyRecetteCaisse[ lgID=" + lgID + " ]";
    }

}
