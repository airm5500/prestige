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
@Table(name = "t_snap_shop_vente_societe")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSnapShopVenteSociete.findAll", query = "SELECT t FROM TSnapShopVenteSociete t"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByLgID", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByStrTIERSPAYANT", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.strTIERSPAYANT = :strTIERSPAYANT"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByStrTYPETIERSPAYANT", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.strTYPETIERSPAYANT = :strTYPETIERSPAYANT"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByIntAMOUNTSALE", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.intAMOUNTSALE = :intAMOUNTSALE"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByIntAMOUNTENCAIS", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.intAMOUNTENCAIS = :intAMOUNTENCAIS"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByDtDAY", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByDtCREATED", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByDtUPDATED", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapShopVenteSociete.findByCodeorganisme", query = "SELECT t FROM TSnapShopVenteSociete t WHERE t.codeorganisme = :codeorganisme") })
public class TSnapShopVenteSociete implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false)
    private Long lgID;
    @Column(name = "str_TIERS_PAYANT", length = 100)
    private String strTIERSPAYANT;
    @Column(name = "str_TYPE_TIERS_PAYANT", length = 70)
    private String strTYPETIERSPAYANT;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT_SALE", precision = 15, scale = 0)
    private Double intAMOUNTSALE;
    @Column(name = "int_AMOUNT_ENCAIS", precision = 15, scale = 0)
    private Double intAMOUNTENCAIS;
    @Column(name = "dt_DAY")
    @Temporal(TemporalType.DATE)
    private Date dtDAY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "CODEORGANISME", length = 100)
    private String codeorganisme;

    public TSnapShopVenteSociete() {
    }

    public TSnapShopVenteSociete(Long lgID) {
        this.lgID = lgID;
    }

    public Long getLgID() {
        return lgID;
    }

    public void setLgID(Long lgID) {
        this.lgID = lgID;
    }

    public String getStrTIERSPAYANT() {
        return strTIERSPAYANT;
    }

    public void setStrTIERSPAYANT(String strTIERSPAYANT) {
        this.strTIERSPAYANT = strTIERSPAYANT;
    }

    public String getStrTYPETIERSPAYANT() {
        return strTYPETIERSPAYANT;
    }

    public void setStrTYPETIERSPAYANT(String strTYPETIERSPAYANT) {
        this.strTYPETIERSPAYANT = strTYPETIERSPAYANT;
    }

    public Double getIntAMOUNTSALE() {
        return intAMOUNTSALE;
    }

    public void setIntAMOUNTSALE(Double intAMOUNTSALE) {
        this.intAMOUNTSALE = intAMOUNTSALE;
    }

    public Double getIntAMOUNTENCAIS() {
        return intAMOUNTENCAIS;
    }

    public void setIntAMOUNTENCAIS(Double intAMOUNTENCAIS) {
        this.intAMOUNTENCAIS = intAMOUNTENCAIS;
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

    public String getCodeorganisme() {
        return codeorganisme;
    }

    public void setCodeorganisme(String codeorganisme) {
        this.codeorganisme = codeorganisme;
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
        if (!(object instanceof TSnapShopVenteSociete)) {
            return false;
        }
        TSnapShopVenteSociete other = (TSnapShopVenteSociete) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopVenteSociete[ lgID=" + lgID + " ]";
    }

}
