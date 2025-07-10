/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
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
@Table(name = "t_compte_client")
@XmlRootElement
public class TCompteClient implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_COMPTE_CLIENT_ID", nullable = false, length = 40)
    private String lgCOMPTECLIENTID;
    @Column(name = "str_CODE_COMPTE_CLIENT", length = 40)
    private String strCODECOMPTECLIENT;
    @Column(name = "str_TYPE", length = 40)
    private String strTYPE;
    @Column(name = "P_KEY", length = 40)
    private String pKey;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_QUOTA_CONSO_MENSUELLE", precision = 12, scale = 2)
    private Double dblQUOTACONSOMENSUELLE;
    @Column(name = "dbl_CAUTION", precision = 12, scale = 2)
    private Double dblCAUTION;
    @Column(name = "dec_Balance", precision = 12, scale = 2)
    private Double decBalance;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "int_COUNTER_TRANSACTION")
    private Integer intCOUNTERTRANSACTION;
    @Column(name = "dec_balance_Disponible")
    private Integer decbalanceDisponible;
    @Column(name = "dec_Balance_InDisponible")
    private Integer decBalanceInDisponible;
    @Column(name = "dt_effective")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtEffective;
    @Column(name = "dbl_PLAFOND", precision = 12, scale = 2)
    private Double dblPLAFOND;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne
    private TClient lgCLIENTID;
    @OneToMany(mappedBy = "lgCOMPTECLIENTID")
    private Collection<TEmplacement> tEmplacementCollection;
    @OneToMany(mappedBy = "struseraccountID")
    private Collection<TTransaction> tTransactionCollection;
    @OneToMany(mappedBy = "lgCOMPTECLIENTID")
    private Collection<TPreenregistrementCompteClient> tPreenregistrementCompteClientCollection;
    @OneToMany(mappedBy = "lgCOMPTECLIENTID")
    private Collection<TCompteClientTiersPayant> tCompteClientTiersPayantCollection;
    @OneToMany(mappedBy = "struseraccountID")
    private Collection<TUserAccountSnapShot> tUserAccountSnapShotCollection;
    //
    // public int getVersion() {
    // return version;
    // }
    //
    // public void setVersion(int version) {
    // this.version = version;
    // }
    //
    // @Version
    // private int version;

    public TCompteClient() {
    }

    public TCompteClient(String lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    public String getLgCOMPTECLIENTID() {
        return lgCOMPTECLIENTID;
    }

    public void setLgCOMPTECLIENTID(String lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    public String getStrCODECOMPTECLIENT() {
        return strCODECOMPTECLIENT;
    }

    public void setStrCODECOMPTECLIENT(String strCODECOMPTECLIENT) {
        this.strCODECOMPTECLIENT = strCODECOMPTECLIENT;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    public String getPKey() {
        return pKey;
    }

    public void setPKey(String pKey) {
        this.pKey = pKey;
    }

    public Double getDblQUOTACONSOMENSUELLE() {
        return dblQUOTACONSOMENSUELLE;
    }

    public void setDblQUOTACONSOMENSUELLE(Double dblQUOTACONSOMENSUELLE) {
        this.dblQUOTACONSOMENSUELLE = dblQUOTACONSOMENSUELLE;
    }

    public Double getDblCAUTION() {
        return dblCAUTION;
    }

    public void setDblCAUTION(Double dblCAUTION) {
        this.dblCAUTION = dblCAUTION;
    }

    public Double getDecBalance() {
        return decBalance;
    }

    public void setDecBalance(Double decBalance) {
        this.decBalance = decBalance;
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

    public Integer getIntCOUNTERTRANSACTION() {
        return intCOUNTERTRANSACTION;
    }

    public void setIntCOUNTERTRANSACTION(Integer intCOUNTERTRANSACTION) {
        this.intCOUNTERTRANSACTION = intCOUNTERTRANSACTION;
    }

    public Integer getDecbalanceDisponible() {
        return decbalanceDisponible;
    }

    public void setDecbalanceDisponible(Integer decbalanceDisponible) {
        this.decbalanceDisponible = decbalanceDisponible;
    }

    public Integer getDecBalanceInDisponible() {
        return decBalanceInDisponible;
    }

    public void setDecBalanceInDisponible(Integer decBalanceInDisponible) {
        this.decBalanceInDisponible = decBalanceInDisponible;
    }

    public Date getDtEffective() {
        return dtEffective;
    }

    public void setDtEffective(Date dtEffective) {
        this.dtEffective = dtEffective;
    }

    public Double getDblPLAFOND() {
        return dblPLAFOND;
    }

    public void setDblPLAFOND(Double dblPLAFOND) {
        this.dblPLAFOND = dblPLAFOND;
    }

    public TClient getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(TClient lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    @XmlTransient
    public Collection<TEmplacement> getTEmplacementCollection() {
        return tEmplacementCollection;
    }

    public void setTEmplacementCollection(Collection<TEmplacement> tEmplacementCollection) {
        this.tEmplacementCollection = tEmplacementCollection;
    }

    @XmlTransient
    public Collection<TTransaction> getTTransactionCollection() {
        return tTransactionCollection;
    }

    public void setTTransactionCollection(Collection<TTransaction> tTransactionCollection) {
        this.tTransactionCollection = tTransactionCollection;
    }

    @XmlTransient
    public Collection<TPreenregistrementCompteClient> getTPreenregistrementCompteClientCollection() {
        return tPreenregistrementCompteClientCollection;
    }

    public void setTPreenregistrementCompteClientCollection(
            Collection<TPreenregistrementCompteClient> tPreenregistrementCompteClientCollection) {
        this.tPreenregistrementCompteClientCollection = tPreenregistrementCompteClientCollection;
    }

    @XmlTransient
    public Collection<TCompteClientTiersPayant> getTCompteClientTiersPayantCollection() {
        return tCompteClientTiersPayantCollection;
    }

    public void setTCompteClientTiersPayantCollection(
            Collection<TCompteClientTiersPayant> tCompteClientTiersPayantCollection) {
        this.tCompteClientTiersPayantCollection = tCompteClientTiersPayantCollection;
    }

    @XmlTransient
    public Collection<TUserAccountSnapShot> getTUserAccountSnapShotCollection() {
        return tUserAccountSnapShotCollection;
    }

    public void setTUserAccountSnapShotCollection(Collection<TUserAccountSnapShot> tUserAccountSnapShotCollection) {
        this.tUserAccountSnapShotCollection = tUserAccountSnapShotCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCOMPTECLIENTID != null ? lgCOMPTECLIENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCompteClient)) {
            return false;
        }
        TCompteClient other = (TCompteClient) object;
        if ((this.lgCOMPTECLIENTID == null && other.lgCOMPTECLIENTID != null)
                || (this.lgCOMPTECLIENTID != null && !this.lgCOMPTECLIENTID.equals(other.lgCOMPTECLIENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCompteClient[ lgCOMPTECLIENTID=" + lgCOMPTECLIENTID + " ]";
    }

}
