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
@Table(name = "t_snap_shop_rupture_stock")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSnapShopRuptureStock.findAll", query = "SELECT t FROM TSnapShopRuptureStock t"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByLgID", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByIntQTY", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.intQTY = :intQTY"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByIntQTYPROPOSE", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.intQTYPROPOSE = :intQTYPROPOSE"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByIntSEUIPROPOSE", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.intSEUIPROPOSE = :intSEUIPROPOSE"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByDtDAY", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByDtCREATED", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByDtUPDATED", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByStrSTATUT", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSnapShopRuptureStock.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TSnapShopRuptureStock t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION") })
public class TSnapShopRuptureStock implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false, length = 50)
    private String lgID;
    @Column(name = "int_QTY")
    private Integer intQTY;
    @Column(name = "int_QTY_PROPOSE")
    private Integer intQTYPROPOSE;
    @Column(name = "int_SEUI_PROPOSE")
    private Integer intSEUIPROPOSE;
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
    @Column(name = "int_NUMBER_TRANSACTION")
    private Integer intNUMBERTRANSACTION;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    public TSnapShopRuptureStock() {
    }

    public TSnapShopRuptureStock(String lgID) {
        this.lgID = lgID;
    }

    public String getLgID() {
        return lgID;
    }

    public void setLgID(String lgID) {
        this.lgID = lgID;
    }

    public Integer getIntQTY() {
        return intQTY;
    }

    public void setIntQTY(Integer intQTY) {
        this.intQTY = intQTY;
    }

    public Integer getIntQTYPROPOSE() {
        return intQTYPROPOSE;
    }

    public void setIntQTYPROPOSE(Integer intQTYPROPOSE) {
        this.intQTYPROPOSE = intQTYPROPOSE;
    }

    public Integer getIntSEUIPROPOSE() {
        return intSEUIPROPOSE;
    }

    public void setIntSEUIPROPOSE(Integer intSEUIPROPOSE) {
        this.intSEUIPROPOSE = intSEUIPROPOSE;
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

    public Integer getIntNUMBERTRANSACTION() {
        return intNUMBERTRANSACTION;
    }

    public void setIntNUMBERTRANSACTION(Integer intNUMBERTRANSACTION) {
        this.intNUMBERTRANSACTION = intNUMBERTRANSACTION;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
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
        if (!(object instanceof TSnapShopRuptureStock)) {
            return false;
        }
        TSnapShopRuptureStock other = (TSnapShopRuptureStock) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopRuptureStock[ lgID=" + lgID + " ]";
    }

}
