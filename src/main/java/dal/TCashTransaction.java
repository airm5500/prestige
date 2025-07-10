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
@Table(name = "t_cash_transaction")

@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCashTransaction.findAll", query = "SELECT t FROM TCashTransaction t"),
        @NamedQuery(name = "TCashTransaction.findById", query = "SELECT t FROM TCashTransaction t WHERE t.id = :id"),
        @NamedQuery(name = "TCashTransaction.findByStrTRANSACTIONREF", query = "SELECT t FROM TCashTransaction t WHERE t.strTRANSACTIONREF = :strTRANSACTIONREF"),
        @NamedQuery(name = "TCashTransaction.findByIntAMOUNT", query = "SELECT t FROM TCashTransaction t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TCashTransaction.findByDtCREATED", query = "SELECT t FROM TCashTransaction t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCashTransaction.findByLgCREATEDBY", query = "SELECT t FROM TCashTransaction t WHERE t.lgCREATEDBY = :lgCREATEDBY"),
        @NamedQuery(name = "TCashTransaction.findByDtUPDATED", query = "SELECT t FROM TCashTransaction t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCashTransaction.findByLgUPDATEDBY", query = "SELECT t FROM TCashTransaction t WHERE t.lgUPDATEDBY = :lgUPDATEDBY"),
        @NamedQuery(name = "TCashTransaction.findByStrDESCRIPTION", query = "SELECT t FROM TCashTransaction t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TCashTransaction.findByIntAMOUNTDEBIT", query = "SELECT t FROM TCashTransaction t WHERE t.intAMOUNTDEBIT = :intAMOUNTDEBIT"),
        @NamedQuery(name = "TCashTransaction.findByIntAMOUNTCREDIT", query = "SELECT t FROM TCashTransaction t WHERE t.intAMOUNTCREDIT = :intAMOUNTCREDIT"),
        @NamedQuery(name = "TCashTransaction.findByStrREFCOMPTECLIENT", query = "SELECT t FROM TCashTransaction t WHERE t.strREFCOMPTECLIENT = :strREFCOMPTECLIENT"),
        @NamedQuery(name = "TCashTransaction.findByStrNUMEROCOMPTE", query = "SELECT t FROM TCashTransaction t WHERE t.strNUMEROCOMPTE = :strNUMEROCOMPTE"),
        @NamedQuery(name = "TCashTransaction.findByIntAMOUNTREMIS", query = "SELECT t FROM TCashTransaction t WHERE t.intAMOUNTREMIS = :intAMOUNTREMIS"),
        @NamedQuery(name = "TCashTransaction.findByIntAMOUNTRECU", query = "SELECT t FROM TCashTransaction t WHERE t.intAMOUNTRECU = :intAMOUNTRECU"),
        @NamedQuery(name = "TCashTransaction.findByStrTASK", query = "SELECT t FROM TCashTransaction t WHERE t.strTASK = :strTASK"),
        @NamedQuery(name = "TCashTransaction.findByLgTYPEREGLEMENTID", query = "SELECT t FROM TCashTransaction t WHERE t.lgTYPEREGLEMENTID = :lgTYPEREGLEMENTID"),
        @NamedQuery(name = "TCashTransaction.findByStrTYPEVENTE", query = "SELECT t FROM TCashTransaction t WHERE t.strTYPEVENTE = :strTYPEVENTE"),
        @NamedQuery(name = "TCashTransaction.findByStrREFFACTURE", query = "SELECT t FROM TCashTransaction t WHERE t.strREFFACTURE = :strREFFACTURE"),
        @NamedQuery(name = "TCashTransaction.findByStrRESSOURCEREF", query = "SELECT t FROM TCashTransaction t WHERE t.strRESSOURCEREF = :strRESSOURCEREF"),
        @NamedQuery(name = "TCashTransaction.findByStrTYPE", query = "SELECT t FROM TCashTransaction t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TCashTransaction.findByBoolCHECKED", query = "SELECT t FROM TCashTransaction t WHERE t.boolCHECKED = :boolCHECKED") })
public class TCashTransaction implements Serializable {

    @Column(name = "int_AMOUNT2")
    private Integer intAMOUNT2;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ID", nullable = false, length = 40)
    private String id;
    @Column(name = "str_TRANSACTION_REF", length = 20)
    private String strTRANSACTIONREF;
    @Column(name = "int_AMOUNT")
    private Integer intAMOUNT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "lg_CREATED_BY", length = 40)
    private String lgCREATEDBY;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "lg_UPDATED_BY", length = 40)
    private String lgUPDATEDBY;
    @Column(name = "str_DESCRIPTION", length = 2000)
    private String strDESCRIPTION;
    @Column(name = "int_AMOUNT_DEBIT")
    private Integer intAMOUNTDEBIT;
    @Column(name = "int_AMOUNT_CREDIT")
    private Integer intAMOUNTCREDIT;
    @Column(name = "str_REF_COMPTE_CLIENT", length = 40)
    private String strREFCOMPTECLIENT;
    @Column(name = "str_NUMERO_COMPTE", length = 20)
    private String strNUMEROCOMPTE;
    @Column(name = "int_AMOUNT_REMIS")
    private Integer intAMOUNTREMIS;
    @Column(name = "int_AMOUNT_RECU")
    private Integer intAMOUNTRECU;
    @Column(name = "str_TASK", length = 20)
    private String strTASK;
    @Column(name = "lg_TYPE_REGLEMENT_ID", length = 40)
    private String lgTYPEREGLEMENTID;
    @Column(name = "str_TYPE_VENTE", length = 20)
    private String strTYPEVENTE;
    @Column(name = "str_REF_FACTURE", length = 40)
    private String strREFFACTURE;
    @Column(name = "str_RESSOURCE_REF", length = 40)
    private String strRESSOURCEREF;
    @Column(name = "str_TYPE")
    private Boolean strTYPE;
    @Column(name = "bool_CHECKED")
    private Boolean boolCHECKED;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_MOTIF_REGLEMENT_ID", referencedColumnName = "lg_MOTIF_REGLEMENT_ID")
    @ManyToOne
    private TMotifReglement lgMOTIFREGLEMENTID;
    @JoinColumn(name = "lg_REGLEMENT_ID", referencedColumnName = "lg_REGLEMENT_ID")
    @ManyToOne
    private TReglement lgREGLEMENTID;
    @Column(name = "int_ACCOUNT")
    private Integer intACCOUNT;
    @JoinColumn(name = "lgUSERCAISSIERID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser caissier;

    public TCashTransaction() {
    }

    public TUser getCaissier() {
        return caissier;
    }

    public void setCaissier(TUser caissier) {
        this.caissier = caissier;
    }

    public TCashTransaction(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStrTRANSACTIONREF() {
        return strTRANSACTIONREF;
    }

    public void setStrTRANSACTIONREF(String strTRANSACTIONREF) {
        this.strTRANSACTIONREF = strTRANSACTIONREF;
    }

    public Integer getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Integer intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getLgCREATEDBY() {
        return lgCREATEDBY;
    }

    public void setLgCREATEDBY(String lgCREATEDBY) {
        this.lgCREATEDBY = lgCREATEDBY;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getLgUPDATEDBY() {
        return lgUPDATEDBY;
    }

    public void setLgUPDATEDBY(String lgUPDATEDBY) {
        this.lgUPDATEDBY = lgUPDATEDBY;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public Integer getIntAMOUNTDEBIT() {
        return intAMOUNTDEBIT;
    }

    public void setIntAMOUNTDEBIT(Integer intAMOUNTDEBIT) {
        this.intAMOUNTDEBIT = intAMOUNTDEBIT;
    }

    public Integer getIntAMOUNTCREDIT() {
        return intAMOUNTCREDIT;
    }

    public void setIntAMOUNTCREDIT(Integer intAMOUNTCREDIT) {
        this.intAMOUNTCREDIT = intAMOUNTCREDIT;
    }

    public String getStrREFCOMPTECLIENT() {
        return strREFCOMPTECLIENT;
    }

    public void setStrREFCOMPTECLIENT(String strREFCOMPTECLIENT) {
        this.strREFCOMPTECLIENT = strREFCOMPTECLIENT;
    }

    public String getStrNUMEROCOMPTE() {
        return strNUMEROCOMPTE;
    }

    public void setStrNUMEROCOMPTE(String strNUMEROCOMPTE) {
        this.strNUMEROCOMPTE = strNUMEROCOMPTE;
    }

    public Integer getIntAMOUNTREMIS() {
        return intAMOUNTREMIS;
    }

    public void setIntAMOUNTREMIS(Integer intAMOUNTREMIS) {
        this.intAMOUNTREMIS = intAMOUNTREMIS;
    }

    public Integer getIntAMOUNTRECU() {
        return intAMOUNTRECU;
    }

    public void setIntAMOUNTRECU(Integer intAMOUNTRECU) {
        this.intAMOUNTRECU = intAMOUNTRECU;
    }

    public String getStrTASK() {
        return strTASK;
    }

    public void setStrTASK(String strTASK) {
        this.strTASK = strTASK;
    }

    public String getLgTYPEREGLEMENTID() {
        return lgTYPEREGLEMENTID;
    }

    public void setLgTYPEREGLEMENTID(String lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
    }

    public String getStrTYPEVENTE() {
        return strTYPEVENTE;
    }

    public void setStrTYPEVENTE(String strTYPEVENTE) {
        this.strTYPEVENTE = strTYPEVENTE;
    }

    public String getStrREFFACTURE() {
        return strREFFACTURE;
    }

    public void setStrREFFACTURE(String strREFFACTURE) {
        this.strREFFACTURE = strREFFACTURE;
    }

    public String getStrRESSOURCEREF() {
        return strRESSOURCEREF;
    }

    public void setStrRESSOURCEREF(String strRESSOURCEREF) {
        this.strRESSOURCEREF = strRESSOURCEREF;
    }

    public Boolean getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(Boolean strTYPE) {
        this.strTYPE = strTYPE;
    }

    public Boolean getBoolCHECKED() {
        return boolCHECKED;
    }

    public void setBoolCHECKED(Boolean boolCHECKED) {
        this.boolCHECKED = boolCHECKED;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TMotifReglement getLgMOTIFREGLEMENTID() {
        return lgMOTIFREGLEMENTID;
    }

    public void setLgMOTIFREGLEMENTID(TMotifReglement lgMOTIFREGLEMENTID) {
        this.lgMOTIFREGLEMENTID = lgMOTIFREGLEMENTID;
    }

    public TReglement getLgREGLEMENTID() {
        return lgREGLEMENTID;
    }

    public void setLgREGLEMENTID(TReglement lgREGLEMENTID) {
        this.lgREGLEMENTID = lgREGLEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (id != null ? id.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCashTransaction)) {
            return false;
        }
        TCashTransaction other = (TCashTransaction) object;
        if ((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCashTransaction[ id=" + id + " ]";
    }

    public Integer getIntAMOUNT2() {
        return intAMOUNT2;
    }

    public void setIntAMOUNT2(Integer intAMOUNT2) {
        this.intAMOUNT2 = intAMOUNT2;
    }

    public Integer getIntACCOUNT() {
        return intACCOUNT;
    }

    public void setIntACCOUNT(Integer intACCOUNT) {
        this.intACCOUNT = intACCOUNT;
    }

}
