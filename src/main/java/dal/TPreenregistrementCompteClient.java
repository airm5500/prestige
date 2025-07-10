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
@Table(name = "t_preenregistrement_compte_client")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TPreenregistrementCompteClient.findAll", query = "SELECT t FROM TPreenregistrementCompteClient t"),
        @NamedQuery(name = "TPreenregistrementCompteClient.findByLgPREENREGISTREMENTCOMPTECLIENTID", query = "SELECT t FROM TPreenregistrementCompteClient t WHERE t.lgPREENREGISTREMENTCOMPTECLIENTID = :lgPREENREGISTREMENTCOMPTECLIENTID"),
        @NamedQuery(name = "TPreenregistrementCompteClient.findByStrSTATUT", query = "SELECT t FROM TPreenregistrementCompteClient t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TPreenregistrementCompteClient.findByDtCREATED", query = "SELECT t FROM TPreenregistrementCompteClient t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TPreenregistrementCompteClient.findByDtUPDATED", query = "SELECT t FROM TPreenregistrementCompteClient t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TPreenregistrementCompteClient.findByIntPRICE", query = "SELECT t FROM TPreenregistrementCompteClient t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TPreenregistrementCompteClient.findByIntPRICERESTE", query = "SELECT t FROM TPreenregistrementCompteClient t WHERE t.intPRICERESTE = :intPRICERESTE") })
public class TPreenregistrementCompteClient implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_PREENREGISTREMENT_COMPTE_CLIENT_ID", nullable = false, length = 40)
    private String lgPREENREGISTREMENTCOMPTECLIENTID;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_RESTE")
    private Integer intPRICERESTE;
    @JoinColumn(name = "lg_COMPTE_CLIENT_ID", referencedColumnName = "lg_COMPTE_CLIENT_ID")
    @ManyToOne
    private TCompteClient lgCOMPTECLIENTID;
    @JoinColumn(name = "lg_PREENREGISTREMENT_ID", referencedColumnName = "lg_PREENREGISTREMENT_ID")
    @ManyToOne
    private TPreenregistrement lgPREENREGISTREMENTID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TPreenregistrementCompteClient() {
    }

    public TPreenregistrementCompteClient(String lgPREENREGISTREMENTCOMPTECLIENTID) {
        this.lgPREENREGISTREMENTCOMPTECLIENTID = lgPREENREGISTREMENTCOMPTECLIENTID;
    }

    public String getLgPREENREGISTREMENTCOMPTECLIENTID() {
        return lgPREENREGISTREMENTCOMPTECLIENTID;
    }

    public void setLgPREENREGISTREMENTCOMPTECLIENTID(String lgPREENREGISTREMENTCOMPTECLIENTID) {
        this.lgPREENREGISTREMENTCOMPTECLIENTID = lgPREENREGISTREMENTCOMPTECLIENTID;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
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

    public Integer getIntPRICERESTE() {
        return intPRICERESTE;
    }

    public void setIntPRICERESTE(Integer intPRICERESTE) {
        this.intPRICERESTE = intPRICERESTE;
    }

    public TCompteClient getLgCOMPTECLIENTID() {
        return lgCOMPTECLIENTID;
    }

    public void setLgCOMPTECLIENTID(TCompteClient lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    public TPreenregistrement getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public void setLgPREENREGISTREMENTID(TPreenregistrement lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
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
        hash += (lgPREENREGISTREMENTCOMPTECLIENTID != null ? lgPREENREGISTREMENTCOMPTECLIENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPreenregistrementCompteClient)) {
            return false;
        }
        TPreenregistrementCompteClient other = (TPreenregistrementCompteClient) object;
        if ((this.lgPREENREGISTREMENTCOMPTECLIENTID == null && other.lgPREENREGISTREMENTCOMPTECLIENTID != null)
                || (this.lgPREENREGISTREMENTCOMPTECLIENTID != null
                        && !this.lgPREENREGISTREMENTCOMPTECLIENTID.equals(other.lgPREENREGISTREMENTCOMPTECLIENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPreenregistrementCompteClient[ lgPREENREGISTREMENTCOMPTECLIENTID="
                + lgPREENREGISTREMENTCOMPTECLIENTID + " ]";
    }

}
