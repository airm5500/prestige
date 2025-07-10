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
@Table(name = "t_snap_shop_daly_recette")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSnapShopDalyRecette.findAll", query = "SELECT t FROM TSnapShopDalyRecette t"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByLgID", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByIntAMOUNT", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByDtDAY", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByDtCREATED", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByDtUPDATED", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByStrSTATUT", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSnapShopDalyRecette.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TSnapShopDalyRecette t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION") })
public class TSnapShopDalyRecette implements Serializable {
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
    @JoinColumn(name = "lg_TYPE_RECETTE_ID", referencedColumnName = "lg_TYPE_RECETTE_ID")
    @ManyToOne
    private TTypeRecette lgTYPERECETTEID;

    public TSnapShopDalyRecette() {
    }

    public TSnapShopDalyRecette(String lgID) {
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
        if (!(object instanceof TSnapShopDalyRecette)) {
            return false;
        }
        TSnapShopDalyRecette other = (TSnapShopDalyRecette) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopDalyRecette[ lgID=" + lgID + " ]";
    }

}
