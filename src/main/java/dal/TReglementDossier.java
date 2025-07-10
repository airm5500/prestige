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
@Table(name = "t_reglement_dossier")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TReglementDossier.findAll", query = "SELECT t FROM TReglementDossier t"),
        @NamedQuery(name = "TReglementDossier.findByLgREGLEMENTDOSSIERID", query = "SELECT t FROM TReglementDossier t WHERE t.lgREGLEMENTDOSSIERID = :lgREGLEMENTDOSSIERID"),
        @NamedQuery(name = "TReglementDossier.findByStrREFRESSOURCE", query = "SELECT t FROM TReglementDossier t WHERE t.strREFRESSOURCE = :strREFRESSOURCE"),
        @NamedQuery(name = "TReglementDossier.findByDblMONTANT", query = "SELECT t FROM TReglementDossier t WHERE t.dblMONTANT = :dblMONTANT"),
        @NamedQuery(name = "TReglementDossier.findByDblMONTANTRESTANT", query = "SELECT t FROM TReglementDossier t WHERE t.dblMONTANTRESTANT = :dblMONTANTRESTANT"),
        @NamedQuery(name = "TReglementDossier.findByDblMONTANTPAYE", query = "SELECT t FROM TReglementDossier t WHERE t.dblMONTANTPAYE = :dblMONTANTPAYE"),
        @NamedQuery(name = "TReglementDossier.findByStrSTATUT", query = "SELECT t FROM TReglementDossier t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TReglementDossier.findByBISPARTIEL", query = "SELECT t FROM TReglementDossier t WHERE t.bISPARTIEL = :bISPARTIEL"),
        @NamedQuery(name = "TReglementDossier.findByLgMODEREGLEMENT", query = "SELECT t FROM TReglementDossier t WHERE t.lgMODEREGLEMENT = :lgMODEREGLEMENT"),
        @NamedQuery(name = "TReglementDossier.findByStrBANQUE", query = "SELECT t FROM TReglementDossier t WHERE t.strBANQUE = :strBANQUE"),
        @NamedQuery(name = "TReglementDossier.findByDtDATEREGLEMENT", query = "SELECT t FROM TReglementDossier t WHERE t.dtDATEREGLEMENT = :dtDATEREGLEMENT"),
        @NamedQuery(name = "TReglementDossier.findByStrPEREREGLEMENT", query = "SELECT t FROM TReglementDossier t WHERE t.strPEREREGLEMENT = :strPEREREGLEMENT"),
        @NamedQuery(name = "TReglementDossier.findByDtCREATED", query = "SELECT t FROM TReglementDossier t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TReglementDossier.findByDtUPDATED", query = "SELECT t FROM TReglementDossier t WHERE t.dtUPDATED = :dtUPDATED") })
public class TReglementDossier implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_REGLEMENT_DOSSIER_ID", nullable = false, length = 40)
    private String lgREGLEMENTDOSSIERID;
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
    @Column(name = "lg_MODE_REGLEMENT", length = 40)
    private String lgMODEREGLEMENT;
    @Column(name = "str_BANQUE", length = 40)
    private String strBANQUE;
    @Column(name = "dt_DATE_REGLEMENT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATEREGLEMENT;
    @Column(name = "str_PERE_REGLEMENT", length = 40)
    private String strPEREREGLEMENT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TReglementDossier() {
    }

    public TReglementDossier(String lgREGLEMENTDOSSIERID) {
        this.lgREGLEMENTDOSSIERID = lgREGLEMENTDOSSIERID;
    }

    public String getLgREGLEMENTDOSSIERID() {
        return lgREGLEMENTDOSSIERID;
    }

    public void setLgREGLEMENTDOSSIERID(String lgREGLEMENTDOSSIERID) {
        this.lgREGLEMENTDOSSIERID = lgREGLEMENTDOSSIERID;
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

    public String getLgMODEREGLEMENT() {
        return lgMODEREGLEMENT;
    }

    public void setLgMODEREGLEMENT(String lgMODEREGLEMENT) {
        this.lgMODEREGLEMENT = lgMODEREGLEMENT;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgREGLEMENTDOSSIERID != null ? lgREGLEMENTDOSSIERID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TReglementDossier)) {
            return false;
        }
        TReglementDossier other = (TReglementDossier) object;
        if ((this.lgREGLEMENTDOSSIERID == null && other.lgREGLEMENTDOSSIERID != null)
                || (this.lgREGLEMENTDOSSIERID != null
                        && !this.lgREGLEMENTDOSSIERID.equals(other.lgREGLEMENTDOSSIERID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TReglementDossier[ lgREGLEMENTDOSSIERID=" + lgREGLEMENTDOSSIERID + " ]";
    }

}
