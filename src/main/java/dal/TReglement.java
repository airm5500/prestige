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
@Table(name = "t_reglement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TReglement.findAll", query = "SELECT t FROM TReglement t"),
        @NamedQuery(name = "TReglement.findByLgREGLEMENTID", query = "SELECT t FROM TReglement t WHERE t.lgREGLEMENTID = :lgREGLEMENTID"),
        @NamedQuery(name = "TReglement.findByStrREFRESSOURCE", query = "SELECT t FROM TReglement t WHERE t.strREFRESSOURCE = :strREFRESSOURCE"),
        @NamedQuery(name = "TReglement.findByStrBANQUE", query = "SELECT t FROM TReglement t WHERE t.strBANQUE = :strBANQUE"),
        @NamedQuery(name = "TReglement.findByStrLIEU", query = "SELECT t FROM TReglement t WHERE t.strLIEU = :strLIEU"),
        @NamedQuery(name = "TReglement.findByStrCODEMONNAIE", query = "SELECT t FROM TReglement t WHERE t.strCODEMONNAIE = :strCODEMONNAIE"),
        @NamedQuery(name = "TReglement.findByIntTAUX", query = "SELECT t FROM TReglement t WHERE t.intTAUX = :intTAUX"),
        @NamedQuery(name = "TReglement.findByStrCOMMENTAIRE", query = "SELECT t FROM TReglement t WHERE t.strCOMMENTAIRE = :strCOMMENTAIRE"),
        @NamedQuery(name = "TReglement.findByDtCREATED", query = "SELECT t FROM TReglement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TReglement.findByDtUPDATED", query = "SELECT t FROM TReglement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TReglement.findByStrSTATUT", query = "SELECT t FROM TReglement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TReglement.findByBISFACTURE", query = "SELECT t FROM TReglement t WHERE t.bISFACTURE = :bISFACTURE"),
        @NamedQuery(name = "TReglement.findByDtREGLEMENT", query = "SELECT t FROM TReglement t WHERE t.dtREGLEMENT = :dtREGLEMENT"),
        @NamedQuery(name = "TReglement.findByBoolCHECKED", query = "SELECT t FROM TReglement t WHERE t.boolCHECKED = :boolCHECKED") })
public class TReglement implements Serializable {

    @OneToMany(mappedBy = "lgREGLEMENTID")
    private Collection<TPreenregistrement> tPreenregistrementCollection;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_REGLEMENT_ID", nullable = false, length = 40)
    private String lgREGLEMENTID;
    @Column(name = "str_REF_RESSOURCE", length = 40)
    private String strREFRESSOURCE;
    @Column(name = "str_BANQUE", length = 100)
    private String strBANQUE;
    @Column(name = "str_LIEU", length = 100)
    private String strLIEU;
    @Column(name = "str_CODE_MONNAIE", length = 100)
    private String strCODEMONNAIE;
    @Column(name = "int_TAUX")
    private Integer intTAUX;
    @Column(name = "str_COMMENTAIRE", length = 200)
    private String strCOMMENTAIRE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "b_IS_FACTURE")
    private Boolean bISFACTURE;

    @Column(name = "str_FIRST_LAST_NAME", length = 200)
    private String strFIRSTLASTNAME;
    @Column(name = "dt_REGLEMENT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtREGLEMENT;
    @Column(name = "bool_CHECKED")
    private Boolean boolCHECKED;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_MODE_REGLEMENT_ID", referencedColumnName = "lg_MODE_REGLEMENT_ID")
    @ManyToOne
    private TModeReglement lgMODEREGLEMENTID;
    @OneToMany(mappedBy = "lgREGLEMENTID")
    private Collection<TCashTransaction> tCashTransactionCollection;

    public TReglement() {
    }

    public TReglement(String lgREGLEMENTID) {
        this.lgREGLEMENTID = lgREGLEMENTID;
    }

    public String getLgREGLEMENTID() {
        return lgREGLEMENTID;
    }

    public void setLgREGLEMENTID(String lgREGLEMENTID) {
        this.lgREGLEMENTID = lgREGLEMENTID;
    }

    public String getStrREFRESSOURCE() {
        return strREFRESSOURCE;
    }

    public void setStrREFRESSOURCE(String strREFRESSOURCE) {
        this.strREFRESSOURCE = strREFRESSOURCE;
    }

    public String getStrBANQUE() {
        return strBANQUE;
    }

    public void setStrBANQUE(String strBANQUE) {
        this.strBANQUE = strBANQUE;
    }

    public String getStrLIEU() {
        return strLIEU;
    }

    public void setStrLIEU(String strLIEU) {
        this.strLIEU = strLIEU;
    }

    public String getStrCODEMONNAIE() {
        return strCODEMONNAIE;
    }

    public void setStrCODEMONNAIE(String strCODEMONNAIE) {
        this.strCODEMONNAIE = strCODEMONNAIE;
    }

    public Integer getIntTAUX() {
        return intTAUX;
    }

    public void setIntTAUX(Integer intTAUX) {
        this.intTAUX = intTAUX;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
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

    public Boolean getBISFACTURE() {
        return bISFACTURE;
    }

    public void setBISFACTURE(Boolean bISFACTURE) {
        this.bISFACTURE = bISFACTURE;
    }

    public String getStrFIRSTLASTNAME() {
        return strFIRSTLASTNAME;
    }

    public void setStrFIRSTLASTNAME(String strFIRSTLASTNAME) {
        this.strFIRSTLASTNAME = strFIRSTLASTNAME;
    }

    public Date getDtREGLEMENT() {
        return dtREGLEMENT;
    }

    public void setDtREGLEMENT(Date dtREGLEMENT) {
        this.dtREGLEMENT = dtREGLEMENT;
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

    public TModeReglement getLgMODEREGLEMENTID() {
        return lgMODEREGLEMENTID;
    }

    public void setLgMODEREGLEMENTID(TModeReglement lgMODEREGLEMENTID) {
        this.lgMODEREGLEMENTID = lgMODEREGLEMENTID;
    }

    @XmlTransient
    public Collection<TCashTransaction> getTCashTransactionCollection() {
        return tCashTransactionCollection;
    }

    public void setTCashTransactionCollection(Collection<TCashTransaction> tCashTransactionCollection) {
        this.tCashTransactionCollection = tCashTransactionCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgREGLEMENTID != null ? lgREGLEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TReglement)) {
            return false;
        }
        TReglement other = (TReglement) object;
        if ((this.lgREGLEMENTID == null && other.lgREGLEMENTID != null)
                || (this.lgREGLEMENTID != null && !this.lgREGLEMENTID.equals(other.lgREGLEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TReglement[ lgREGLEMENTID=" + lgREGLEMENTID + " ]";
    }

    @XmlTransient
    public Collection<TPreenregistrement> getTPreenregistrementCollection() {
        return tPreenregistrementCollection;
    }

    public void setTPreenregistrementCollection(Collection<TPreenregistrement> tPreenregistrementCollection) {
        this.tPreenregistrementCollection = tPreenregistrementCollection;
    }

}
