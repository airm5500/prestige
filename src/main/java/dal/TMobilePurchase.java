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
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author JZAGO
 */
@Entity
@Table(name = "t_mobile_purchase")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMobilePurchase.findAll", query = "SELECT t FROM TMobilePurchase t"),
        @NamedQuery(name = "TMobilePurchase.findByLgPURCHASEID", query = "SELECT t FROM TMobilePurchase t WHERE t.lgPURCHASEID = :lgPURCHASEID"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASETOKEN", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASETOKEN = :strPURCHASETOKEN"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASESTATUS", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASESTATUS = :strPURCHASESTATUS"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASEMONTANT", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASEMONTANT = :strPURCHASEMONTANT"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASECONTACT", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASECONTACT = :strPURCHASECONTACT"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASEINFO", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASEINFO = :strPURCHASEINFO"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASEREFERENCE", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASEREFERENCE = :strPURCHASEREFERENCE"),
        @NamedQuery(name = "TMobilePurchase.findByDtPURCHASECREATEDDATE", query = "SELECT t FROM TMobilePurchase t WHERE t.dtPURCHASECREATEDDATE = :dtPURCHASECREATEDDATE"),
        @NamedQuery(name = "TMobilePurchase.findByStrPURCHASETIMESTAMP", query = "SELECT t FROM TMobilePurchase t WHERE t.strPURCHASETIMESTAMP = :strPURCHASETIMESTAMP") })
public class TMobilePurchase implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_PURCHASE_ID")
    private String lgPURCHASEID;
    @Basic(optional = false)
    @Column(name = "str_PURCHASE_TOKEN")
    private String strPURCHASETOKEN;
    @Basic(optional = false)
    @Column(name = "str_PURCHASE_STATUS")
    private String strPURCHASESTATUS;
    @Basic(optional = false)
    @Column(name = "str_PURCHASE_MONTANT")
    private String strPURCHASEMONTANT;
    @Basic(optional = false)
    @Column(name = "str_PURCHASE_CONTACT")
    private String strPURCHASECONTACT;
    @Column(name = "str_PURCHASE_INFO")
    private String strPURCHASEINFO;
    @Basic(optional = false)
    @Column(name = "str_PURCHASE_REFERENCE")
    private String strPURCHASEREFERENCE;
    @Column(name = "dt_PURCHASE_CREATED_DATE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPURCHASECREATEDDATE;
    @Column(name = "str_PURCHASE_TIMESTAMP")
    private String strPURCHASETIMESTAMP;

    public TMobilePurchase() {
    }

    public TMobilePurchase(String lgPURCHASEID) {
        this.lgPURCHASEID = lgPURCHASEID;
    }

    public TMobilePurchase(String lgPURCHASEID, String strPURCHASETOKEN, String strPURCHASESTATUS,
            String strPURCHASEMONTANT, String strPURCHASECONTACT, String strPURCHASEREFERENCE) {
        this.lgPURCHASEID = lgPURCHASEID;
        this.strPURCHASETOKEN = strPURCHASETOKEN;
        this.strPURCHASESTATUS = strPURCHASESTATUS;
        this.strPURCHASEMONTANT = strPURCHASEMONTANT;
        this.strPURCHASECONTACT = strPURCHASECONTACT;
        this.strPURCHASEREFERENCE = strPURCHASEREFERENCE;
    }

    public String getLgPURCHASEID() {
        return lgPURCHASEID;
    }

    public void setLgPURCHASEID(String lgPURCHASEID) {
        this.lgPURCHASEID = lgPURCHASEID;
    }

    public String getStrPURCHASETOKEN() {
        return strPURCHASETOKEN;
    }

    public void setStrPURCHASETOKEN(String strPURCHASETOKEN) {
        this.strPURCHASETOKEN = strPURCHASETOKEN;
    }

    public String getStrPURCHASESTATUS() {
        return strPURCHASESTATUS;
    }

    public void setStrPURCHASESTATUS(String strPURCHASESTATUS) {
        this.strPURCHASESTATUS = strPURCHASESTATUS;
    }

    public String getStrPURCHASEMONTANT() {
        return strPURCHASEMONTANT;
    }

    public void setStrPURCHASEMONTANT(String strPURCHASEMONTANT) {
        this.strPURCHASEMONTANT = strPURCHASEMONTANT;
    }

    public String getStrPURCHASECONTACT() {
        return strPURCHASECONTACT;
    }

    public void setStrPURCHASECONTACT(String strPURCHASECONTACT) {
        this.strPURCHASECONTACT = strPURCHASECONTACT;
    }

    public String getStrPURCHASEINFO() {
        return strPURCHASEINFO;
    }

    public void setStrPURCHASEINFO(String strPURCHASEINFO) {
        this.strPURCHASEINFO = strPURCHASEINFO;
    }

    public String getStrPURCHASEREFERENCE() {
        return strPURCHASEREFERENCE;
    }

    public void setStrPURCHASEREFERENCE(String strPURCHASEREFERENCE) {
        this.strPURCHASEREFERENCE = strPURCHASEREFERENCE;
    }

    public Date getDtPURCHASECREATEDDATE() {
        return dtPURCHASECREATEDDATE;
    }

    public void setDtPURCHASECREATEDDATE(Date dtPURCHASECREATEDDATE) {
        this.dtPURCHASECREATEDDATE = dtPURCHASECREATEDDATE;
    }

    public String getStrPURCHASETIMESTAMP() {
        return strPURCHASETIMESTAMP;
    }

    public void setStrPURCHASETIMESTAMP(String strPURCHASETIMESTAMP) {
        this.strPURCHASETIMESTAMP = strPURCHASETIMESTAMP;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgPURCHASEID != null ? lgPURCHASEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMobilePurchase)) {
            return false;
        }
        TMobilePurchase other = (TMobilePurchase) object;
        if ((this.lgPURCHASEID == null && other.lgPURCHASEID != null)
                || (this.lgPURCHASEID != null && !this.lgPURCHASEID.equals(other.lgPURCHASEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMobilePurchase[ lgPURCHASEID=" + lgPURCHASEID + " ]";
    }

}
