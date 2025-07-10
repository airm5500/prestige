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
@Table(name = "t_snap_shop_daly_stat")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSnapShopDalyStat.findAll", query = "SELECT t FROM TSnapShopDalyStat t"),
        @NamedQuery(name = "TSnapShopDalyStat.findByLgID", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopDalyStat.findByIntAMOUNT", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TSnapShopDalyStat.findByDtDAY", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopDalyStat.findByDtCREATED", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopDalyStat.findByDtUPDATED", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapShopDalyStat.findByStrSTATUT", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSnapShopDalyStat.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION"),
        @NamedQuery(name = "TSnapShopDalyStat.findByIntNUMBER", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TSnapShopDalyStat.findByStrPKEY", query = "SELECT t FROM TSnapShopDalyStat t WHERE t.strPKEY = :strPKEY") })
public class TSnapShopDalyStat implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false, length = 50)
    private String lgID;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT", precision = 15, scale = 3)
    private Double intAMOUNT;
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
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Basic(optional = false)
    @Column(name = "str_PKEY", nullable = false, length = 40)
    private String strPKEY;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_TRANCHE_HORAIRE_ID", referencedColumnName = "lg_TRANCHE_HORAIRE_ID")
    @ManyToOne
    private TTrancheHoraire lgTRANCHEHORAIREID;
    @JoinColumn(name = "lg_TYPE_VENTE_ID", referencedColumnName = "lg_TYPE_VENTE_ID")
    @ManyToOne
    private TTypeVente lgTYPEVENTEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TSnapShopDalyStat() {
    }

    public TSnapShopDalyStat(String lgID) {
        this.lgID = lgID;
    }

    public TSnapShopDalyStat(String lgID, String strPKEY) {
        this.lgID = lgID;
        this.strPKEY = strPKEY;
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

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public String getStrPKEY() {
        return strPKEY;
    }

    public void setStrPKEY(String strPKEY) {
        this.strPKEY = strPKEY;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TTrancheHoraire getLgTRANCHEHORAIREID() {
        return lgTRANCHEHORAIREID;
    }

    public void setLgTRANCHEHORAIREID(TTrancheHoraire lgTRANCHEHORAIREID) {
        this.lgTRANCHEHORAIREID = lgTRANCHEHORAIREID;
    }

    public TTypeVente getLgTYPEVENTEID() {
        return lgTYPEVENTEID;
    }

    public void setLgTYPEVENTEID(TTypeVente lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
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
        if (!(object instanceof TSnapShopDalyStat)) {
            return false;
        }
        TSnapShopDalyStat other = (TSnapShopDalyStat) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopDalyStat[ lgID=" + lgID + " ]";
    }

}
