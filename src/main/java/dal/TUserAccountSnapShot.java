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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_user_account_snap_shot", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "lg_SNAP_SHOT_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TUserAccountSnapShot.findAll", query = "SELECT t FROM TUserAccountSnapShot t"),
        @NamedQuery(name = "TUserAccountSnapShot.findByStraccounttypeID", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.straccounttypeID = :straccounttypeID"),
        @NamedQuery(name = "TUserAccountSnapShot.findByDecBalance", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.decBalance = :decBalance"),
        @NamedQuery(name = "TUserAccountSnapShot.findByDtDateCreation", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.dtDateCreation = :dtDateCreation"),
        @NamedQuery(name = "TUserAccountSnapShot.findByDtLastUpdate", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.dtLastUpdate = :dtLastUpdate"),
        @NamedQuery(name = "TUserAccountSnapShot.findByLgCustomerId", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.lgCustomerId = :lgCustomerId"),
        @NamedQuery(name = "TUserAccountSnapShot.findByBActive", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.bActive = :bActive"),
        @NamedQuery(name = "TUserAccountSnapShot.findByDtEffective", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.dtEffective = :dtEffective"),
        @NamedQuery(name = "TUserAccountSnapShot.findByDecBalanceDisponible", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.decBalanceDisponible = :decBalanceDisponible"),
        @NamedQuery(name = "TUserAccountSnapShot.findByDecBalanceInDisponible", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.decBalanceInDisponible = :decBalanceInDisponible"),
        @NamedQuery(name = "TUserAccountSnapShot.findByLgSNAPSHOTID", query = "SELECT t FROM TUserAccountSnapShot t WHERE t.lgSNAPSHOTID = :lgSNAPSHOTID") })
public class TUserAccountSnapShot implements Serializable {
    private static final long serialVersionUID = 1L;
    @Column(name = "str_account_type_ID", length = 200)
    private String straccounttypeID;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dec_Balance", precision = 15, scale = 3)
    private Double decBalance;
    @Column(name = "dt_date_creation")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDateCreation;
    @Column(name = "dt_last_update")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtLastUpdate;
    @Column(name = "lg_customer_id", length = 200)
    private String lgCustomerId;
    @Column(name = "b_active")
    private Boolean bActive;
    @Column(name = "dt_effective")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtEffective;
    @Column(name = "dec_Balance_Disponible", precision = 15, scale = 3)
    private Double decBalanceDisponible;
    @Column(name = "dec_Balance_InDisponible", precision = 15, scale = 3)
    private Double decBalanceInDisponible;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SNAP_SHOT_ID", nullable = false, length = 50)
    private String lgSNAPSHOTID;
    @JoinColumn(name = "str_user_account_ID", referencedColumnName = "lg_COMPTE_CLIENT_ID")
    @ManyToOne
    private TCompteClient struseraccountID;

    public TUserAccountSnapShot() {
    }

    public TUserAccountSnapShot(String lgSNAPSHOTID) {
        this.lgSNAPSHOTID = lgSNAPSHOTID;
    }

    public String getStraccounttypeID() {
        return straccounttypeID;
    }

    public void setStraccounttypeID(String straccounttypeID) {
        this.straccounttypeID = straccounttypeID;
    }

    public Double getDecBalance() {
        return decBalance;
    }

    public void setDecBalance(Double decBalance) {
        this.decBalance = decBalance;
    }

    public Date getDtDateCreation() {
        return dtDateCreation;
    }

    public void setDtDateCreation(Date dtDateCreation) {
        this.dtDateCreation = dtDateCreation;
    }

    public Date getDtLastUpdate() {
        return dtLastUpdate;
    }

    public void setDtLastUpdate(Date dtLastUpdate) {
        this.dtLastUpdate = dtLastUpdate;
    }

    public String getLgCustomerId() {
        return lgCustomerId;
    }

    public void setLgCustomerId(String lgCustomerId) {
        this.lgCustomerId = lgCustomerId;
    }

    public Boolean getBActive() {
        return bActive;
    }

    public void setBActive(Boolean bActive) {
        this.bActive = bActive;
    }

    public Date getDtEffective() {
        return dtEffective;
    }

    public void setDtEffective(Date dtEffective) {
        this.dtEffective = dtEffective;
    }

    public Double getDecBalanceDisponible() {
        return decBalanceDisponible;
    }

    public void setDecBalanceDisponible(Double decBalanceDisponible) {
        this.decBalanceDisponible = decBalanceDisponible;
    }

    public Double getDecBalanceInDisponible() {
        return decBalanceInDisponible;
    }

    public void setDecBalanceInDisponible(Double decBalanceInDisponible) {
        this.decBalanceInDisponible = decBalanceInDisponible;
    }

    public String getLgSNAPSHOTID() {
        return lgSNAPSHOTID;
    }

    public void setLgSNAPSHOTID(String lgSNAPSHOTID) {
        this.lgSNAPSHOTID = lgSNAPSHOTID;
    }

    public TCompteClient getStruseraccountID() {
        return struseraccountID;
    }

    public void setStruseraccountID(TCompteClient struseraccountID) {
        this.struseraccountID = struseraccountID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSNAPSHOTID != null ? lgSNAPSHOTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TUserAccountSnapShot)) {
            return false;
        }
        TUserAccountSnapShot other = (TUserAccountSnapShot) object;
        if ((this.lgSNAPSHOTID == null && other.lgSNAPSHOTID != null)
                || (this.lgSNAPSHOTID != null && !this.lgSNAPSHOTID.equals(other.lgSNAPSHOTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TUserAccountSnapShot[ lgSNAPSHOTID=" + lgSNAPSHOTID + " ]";
    }

}
