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
@Table(name = "t_snapshot_preenregistrement_compte_client_tiers_payent")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findAll", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByLgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID = :lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByStrSTATUT", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByStrREF", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByDtCREATED", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByDtUPDATED", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSnapshotPreenregistrementCompteClientTiersPayent.findByIntPRICE", query = "SELECT t FROM TSnapshotPreenregistrementCompteClientTiersPayent t WHERE t.intPRICE = :intPRICE") })
public class TSnapshotPreenregistrementCompteClientTiersPayent implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID", nullable = false, length = 40)
    private String lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID;
    @Basic(optional = false)
    @Column(name = "int_NUMBER_TRANSACTION", nullable = false)
    private int intNUMBERTRANSACTION;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_REF", length = 40)
    private String strREF;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @JoinColumn(name = "lg_COMPTE_CLIENT_TIERS_PAYANT_ID", referencedColumnName = "lg_COMPTE_CLIENT_TIERS_PAYANT_ID")
    @ManyToOne
    private TCompteClientTiersPayant lgCOMPTECLIENTTIERSPAYANTID;

    public TSnapshotPreenregistrementCompteClientTiersPayent() {
    }

    public TSnapshotPreenregistrementCompteClientTiersPayent(
            String lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID) {
        this.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID = lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID;
    }

    public TSnapshotPreenregistrementCompteClientTiersPayent(String lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID,
            int intNUMBERTRANSACTION) {
        this.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID = lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID;
        this.intNUMBERTRANSACTION = intNUMBERTRANSACTION;
    }

    public String getLgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID() {
        return lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID;
    }

    public void setLgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID(
            String lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID) {
        this.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID = lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID;
    }

    public int getIntNUMBERTRANSACTION() {
        return intNUMBERTRANSACTION;
    }

    public void setIntNUMBERTRANSACTION(int intNUMBERTRANSACTION) {
        this.intNUMBERTRANSACTION = intNUMBERTRANSACTION;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
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

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public TCompteClientTiersPayant getLgCOMPTECLIENTTIERSPAYANTID() {
        return lgCOMPTECLIENTTIERSPAYANTID;
    }

    public void setLgCOMPTECLIENTTIERSPAYANTID(TCompteClientTiersPayant lgCOMPTECLIENTTIERSPAYANTID) {
        this.lgCOMPTECLIENTTIERSPAYANTID = lgCOMPTECLIENTTIERSPAYANTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID != null
                ? lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSnapshotPreenregistrementCompteClientTiersPayent)) {
            return false;
        }
        TSnapshotPreenregistrementCompteClientTiersPayent other = (TSnapshotPreenregistrementCompteClientTiersPayent) object;
        if ((this.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID == null
                && other.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID != null)
                || (this.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID != null
                        && !this.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID
                                .equals(other.lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapshotPreenregistrementCompteClientTiersPayent[ lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID="
                + lgSNAPSHOTPREENREGISTREMENTCOMPTECLIENTTIERSPAENTID + " ]";
    }

}
