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
@Table(name = "t_reglement_transaction")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TReglementTransaction.findAll", query = "SELECT t FROM TReglementTransaction t"),
        @NamedQuery(name = "TReglementTransaction.findByLgREGLEMENTTRANSACTIONID", query = "SELECT t FROM TReglementTransaction t WHERE t.lgREGLEMENTTRANSACTIONID = :lgREGLEMENTTRANSACTIONID"),
        @NamedQuery(name = "TReglementTransaction.findByStrREFRESSOURCE", query = "SELECT t FROM TReglementTransaction t WHERE t.strREFRESSOURCE = :strREFRESSOURCE"),
        @NamedQuery(name = "TReglementTransaction.findByDblMONTANT", query = "SELECT t FROM TReglementTransaction t WHERE t.dblMONTANT = :dblMONTANT"),
        @NamedQuery(name = "TReglementTransaction.findByDblMONTANTRESTANT", query = "SELECT t FROM TReglementTransaction t WHERE t.dblMONTANTRESTANT = :dblMONTANTRESTANT"),
        @NamedQuery(name = "TReglementTransaction.findByDblMONTANTPAYE", query = "SELECT t FROM TReglementTransaction t WHERE t.dblMONTANTPAYE = :dblMONTANTPAYE"),
        @NamedQuery(name = "TReglementTransaction.findByStrSTATUT", query = "SELECT t FROM TReglementTransaction t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TReglementTransaction.findByBISPARTIEL", query = "SELECT t FROM TReglementTransaction t WHERE t.bISPARTIEL = :bISPARTIEL"),
        @NamedQuery(name = "TReglementTransaction.findByStrBANQUE", query = "SELECT t FROM TReglementTransaction t WHERE t.strBANQUE = :strBANQUE"),
        @NamedQuery(name = "TReglementTransaction.findByDtDATEREGLEMENT", query = "SELECT t FROM TReglementTransaction t WHERE t.dtDATEREGLEMENT = :dtDATEREGLEMENT"),
        @NamedQuery(name = "TReglementTransaction.findByStrPEREREGLEMENT", query = "SELECT t FROM TReglementTransaction t WHERE t.strPEREREGLEMENT = :strPEREREGLEMENT"),
        @NamedQuery(name = "TReglementTransaction.findByLgTYPEREGLEMENTID", query = "SELECT t FROM TReglementTransaction t WHERE t.lgTYPEREGLEMENTID = :lgTYPEREGLEMENTID"),
        @NamedQuery(name = "TReglementTransaction.findByDtCREATED", query = "SELECT t FROM TReglementTransaction t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TReglementTransaction.findByDtUPDATED", query = "SELECT t FROM TReglementTransaction t WHERE t.dtUPDATED = :dtUPDATED") })
public class TReglementTransaction implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_REGLEMENT_TRANSACTION_ID", nullable = false, length = 40)
    private String lgREGLEMENTTRANSACTIONID;
    @Column(name = "str_REF_RESSOURCE", length = 40)
    private String strREFRESSOURCE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_MONTANT", precision = 15, scale = 3)
    private Double dblMONTANT;
    @Column(name = "dbl_MONTANT_RESTANT", precision = 15, scale = 3)
    private Double dblMONTANTRESTANT;
    @Column(name = "dbl_MONTANT_PAYE", precision = 15, scale = 3)
    private Double dblMONTANTPAYE;
    @Column(name = "str_STATUT", length = 80)
    private String strSTATUT;
    @Column(name = "b_IS_PARTIEL")
    private Short bISPARTIEL;
    @Column(name = "str_BANQUE", length = 40)
    private String strBANQUE;
    @Column(name = "dt_DATE_REGLEMENT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATEREGLEMENT;
    @Column(name = "str_PERE_REGLEMENT", length = 40)
    private String strPEREREGLEMENT;
    @Column(name = "lg_TYPE_REGLEMENT_ID", length = 40)
    private String lgTYPEREGLEMENTID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_MODE_REGLEMENT_ID", referencedColumnName = "lg_MODE_REGLEMENT_ID")
    @ManyToOne
    private TModeReglement lgMODEREGLEMENTID;

    public TReglementTransaction() {
    }

    public TReglementTransaction(String lgREGLEMENTTRANSACTIONID) {
        this.lgREGLEMENTTRANSACTIONID = lgREGLEMENTTRANSACTIONID;
    }

    public String getLgREGLEMENTTRANSACTIONID() {
        return lgREGLEMENTTRANSACTIONID;
    }

    public void setLgREGLEMENTTRANSACTIONID(String lgREGLEMENTTRANSACTIONID) {
        this.lgREGLEMENTTRANSACTIONID = lgREGLEMENTTRANSACTIONID;
    }

    public String getStrREFRESSOURCE() {
        return strREFRESSOURCE;
    }

    public void setStrREFRESSOURCE(String strREFRESSOURCE) {
        this.strREFRESSOURCE = strREFRESSOURCE;
    }

    public Double getDblMONTANT() {
        return dblMONTANT;
    }

    public void setDblMONTANT(Double dblMONTANT) {
        this.dblMONTANT = dblMONTANT;
    }

    public Double getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Double dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
    }

    public Double getDblMONTANTPAYE() {
        return dblMONTANTPAYE;
    }

    public void setDblMONTANTPAYE(Double dblMONTANTPAYE) {
        this.dblMONTANTPAYE = dblMONTANTPAYE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Short getBISPARTIEL() {
        return bISPARTIEL;
    }

    public void setBISPARTIEL(Short bISPARTIEL) {
        this.bISPARTIEL = bISPARTIEL;
    }

    public String getStrBANQUE() {
        return strBANQUE;
    }

    public void setStrBANQUE(String strBANQUE) {
        this.strBANQUE = strBANQUE;
    }

    public Date getDtDATEREGLEMENT() {
        return dtDATEREGLEMENT;
    }

    public void setDtDATEREGLEMENT(Date dtDATEREGLEMENT) {
        this.dtDATEREGLEMENT = dtDATEREGLEMENT;
    }

    public String getStrPEREREGLEMENT() {
        return strPEREREGLEMENT;
    }

    public void setStrPEREREGLEMENT(String strPEREREGLEMENT) {
        this.strPEREREGLEMENT = strPEREREGLEMENT;
    }

    public String getLgTYPEREGLEMENTID() {
        return lgTYPEREGLEMENTID;
    }

    public void setLgTYPEREGLEMENTID(String lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
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

    public TModeReglement getLgMODEREGLEMENTID() {
        return lgMODEREGLEMENTID;
    }

    public void setLgMODEREGLEMENTID(TModeReglement lgMODEREGLEMENTID) {
        this.lgMODEREGLEMENTID = lgMODEREGLEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgREGLEMENTTRANSACTIONID != null ? lgREGLEMENTTRANSACTIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TReglementTransaction)) {
            return false;
        }
        TReglementTransaction other = (TReglementTransaction) object;
        if ((this.lgREGLEMENTTRANSACTIONID == null && other.lgREGLEMENTTRANSACTIONID != null)
                || (this.lgREGLEMENTTRANSACTIONID != null
                        && !this.lgREGLEMENTTRANSACTIONID.equals(other.lgREGLEMENTTRANSACTIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TReglementTransaction[ lgREGLEMENTTRANSACTIONID=" + lgREGLEMENTTRANSACTIONID + " ]";
    }

}
