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
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
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
@Table(name = "t_retrocession")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRetrocession.findAll", query = "SELECT t FROM TRetrocession t"),
        @NamedQuery(name = "TRetrocession.findByLgRETROCESSIONID", query = "SELECT t FROM TRetrocession t WHERE t.lgRETROCESSIONID = :lgRETROCESSIONID"),
        @NamedQuery(name = "TRetrocession.findByStrREFERENCE", query = "SELECT t FROM TRetrocession t WHERE t.strREFERENCE = :strREFERENCE"),
        @NamedQuery(name = "TRetrocession.findByStrCOMMENTAIRE", query = "SELECT t FROM TRetrocession t WHERE t.strCOMMENTAIRE = :strCOMMENTAIRE"),
        @NamedQuery(name = "TRetrocession.findByIntMONTANTHT", query = "SELECT t FROM TRetrocession t WHERE t.intMONTANTHT = :intMONTANTHT"),
        @NamedQuery(name = "TRetrocession.findByIntMONTANTTTC", query = "SELECT t FROM TRetrocession t WHERE t.intMONTANTTTC = :intMONTANTTTC"),
        @NamedQuery(name = "TRetrocession.findByIntREMISE", query = "SELECT t FROM TRetrocession t WHERE t.intREMISE = :intREMISE"),
        @NamedQuery(name = "TRetrocession.findByIntESCOMPTESOCIETE", query = "SELECT t FROM TRetrocession t WHERE t.intESCOMPTESOCIETE = :intESCOMPTESOCIETE"),
        @NamedQuery(name = "TRetrocession.findByStrSTATUT", query = "SELECT t FROM TRetrocession t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRetrocession.findByDtCREATED", query = "SELECT t FROM TRetrocession t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRetrocession.findByDtUPDATED", query = "SELECT t FROM TRetrocession t WHERE t.dtUPDATED = :dtUPDATED") })
public class TRetrocession implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RETROCESSION_ID", nullable = false, length = 20)
    private String lgRETROCESSIONID;
    @Column(name = "str_REFERENCE", length = 20)
    private String strREFERENCE;
    @Column(name = "str_COMMENTAIRE", length = 100)
    private String strCOMMENTAIRE;
    @Column(name = "int_MONTANT_HT")
    private Integer intMONTANTHT;
    @Column(name = "int_MONTANT_TTC")
    private Integer intMONTANTTTC;
    @Column(name = "int_REMISE")
    private Integer intREMISE;
    @Column(name = "int_ESCOMPTE_SOCIETE")
    private Integer intESCOMPTESOCIETE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgRETROCESSIONID")
    private Collection<TRetrocessionDetail> tRetrocessionDetailCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne
    private TClient lgCLIENTID;

    public TRetrocession() {
    }

    public TRetrocession(String lgRETROCESSIONID) {
        this.lgRETROCESSIONID = lgRETROCESSIONID;
    }

    public String getLgRETROCESSIONID() {
        return lgRETROCESSIONID;
    }

    public void setLgRETROCESSIONID(String lgRETROCESSIONID) {
        this.lgRETROCESSIONID = lgRETROCESSIONID;
    }

    public String getStrREFERENCE() {
        return strREFERENCE;
    }

    public void setStrREFERENCE(String strREFERENCE) {
        this.strREFERENCE = strREFERENCE;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    public Integer getIntMONTANTHT() {
        return intMONTANTHT;
    }

    public void setIntMONTANTHT(Integer intMONTANTHT) {
        this.intMONTANTHT = intMONTANTHT;
    }

    public Integer getIntMONTANTTTC() {
        return intMONTANTTTC;
    }

    public void setIntMONTANTTTC(Integer intMONTANTTTC) {
        this.intMONTANTTTC = intMONTANTTTC;
    }

    public Integer getIntREMISE() {
        return intREMISE;
    }

    public void setIntREMISE(Integer intREMISE) {
        this.intREMISE = intREMISE;
    }

    public Integer getIntESCOMPTESOCIETE() {
        return intESCOMPTESOCIETE;
    }

    public void setIntESCOMPTESOCIETE(Integer intESCOMPTESOCIETE) {
        this.intESCOMPTESOCIETE = intESCOMPTESOCIETE;
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

    @XmlTransient
    public Collection<TRetrocessionDetail> getTRetrocessionDetailCollection() {
        return tRetrocessionDetailCollection;
    }

    public void setTRetrocessionDetailCollection(Collection<TRetrocessionDetail> tRetrocessionDetailCollection) {
        this.tRetrocessionDetailCollection = tRetrocessionDetailCollection;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TClient getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(TClient lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgRETROCESSIONID != null ? lgRETROCESSIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRetrocession)) {
            return false;
        }
        TRetrocession other = (TRetrocession) object;
        if ((this.lgRETROCESSIONID == null && other.lgRETROCESSIONID != null)
                || (this.lgRETROCESSIONID != null && !this.lgRETROCESSIONID.equals(other.lgRETROCESSIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRetrocession[ lgRETROCESSIONID=" + lgRETROCESSIONID + " ]";
    }

}
