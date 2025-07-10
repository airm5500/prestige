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
@Table(name = "t_snap_shop_daly_sortie_famille")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TSnapShopDalySortieFamille.findAll", query = "SELECT t FROM TSnapShopDalySortieFamille t"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByLgID", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByIntBALANCE", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.intBALANCE = :intBALANCE"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByDtDAY", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByDtCREATED", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByDtUPDATED", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByStrSTATUT", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByIntNUMBERENTREE", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.intNUMBERENTREE = :intNUMBERENTREE"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByIntNUMBERSORTIE", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.intNUMBERSORTIE = :intNUMBERSORTIE"),
        @NamedQuery(name = "TSnapShopDalySortieFamille.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TSnapShopDalySortieFamille t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION") })
public class TSnapShopDalySortieFamille implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false, length = 50)
    private String lgID;
    @Column(name = "int_BALANCE")
    private Integer intBALANCE;
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
    @Column(name = "int_NUMBER_ENTREE")
    private Integer intNUMBERENTREE;
    @Column(name = "int_NUMBER_SORTIE")
    private Integer intNUMBERSORTIE;
    @Column(name = "int_NUMBERTRANSACTION")
    private Integer intNUMBERTRANSACTION;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    public TSnapShopDalySortieFamille() {
    }

    public TSnapShopDalySortieFamille(String lgID) {
        this.lgID = lgID;
    }

    public String getLgID() {
        return lgID;
    }

    public void setLgID(String lgID) {
        this.lgID = lgID;
    }

    public Integer getIntBALANCE() {
        return intBALANCE;
    }

    public void setIntBALANCE(Integer intBALANCE) {
        this.intBALANCE = intBALANCE;
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

    public Integer getIntNUMBERENTREE() {
        return intNUMBERENTREE;
    }

    public void setIntNUMBERENTREE(Integer intNUMBERENTREE) {
        this.intNUMBERENTREE = intNUMBERENTREE;
    }

    public Integer getIntNUMBERSORTIE() {
        return intNUMBERSORTIE;
    }

    public void setIntNUMBERSORTIE(Integer intNUMBERSORTIE) {
        this.intNUMBERSORTIE = intNUMBERSORTIE;
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
        if (!(object instanceof TSnapShopDalySortieFamille)) {
            return false;
        }
        TSnapShopDalySortieFamille other = (TSnapShopDalySortieFamille) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopDalySortieFamille[ lgID=" + lgID + " ]";
    }

}
