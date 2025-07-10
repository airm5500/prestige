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
@Table(name = "t_reglement_bordereau")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TReglementBordereau.findAll", query = "SELECT t FROM TReglementBordereau t"),
        @NamedQuery(name = "TReglementBordereau.findByLgREGLEMENTBORDEREAUID", query = "SELECT t FROM TReglementBordereau t WHERE t.lgREGLEMENTBORDEREAUID = :lgREGLEMENTBORDEREAUID"),
        @NamedQuery(name = "TReglementBordereau.findByStrREFRESSOURCE", query = "SELECT t FROM TReglementBordereau t WHERE t.strREFRESSOURCE = :strREFRESSOURCE"),
        @NamedQuery(name = "TReglementBordereau.findByDblMONTANT", query = "SELECT t FROM TReglementBordereau t WHERE t.dblMONTANT = :dblMONTANT"),
        @NamedQuery(name = "TReglementBordereau.findByDblMONTANTRESTANT", query = "SELECT t FROM TReglementBordereau t WHERE t.dblMONTANTRESTANT = :dblMONTANTRESTANT"),
        @NamedQuery(name = "TReglementBordereau.findByDblMONTANTPAYE", query = "SELECT t FROM TReglementBordereau t WHERE t.dblMONTANTPAYE = :dblMONTANTPAYE"),
        @NamedQuery(name = "TReglementBordereau.findByStrSTATUT", query = "SELECT t FROM TReglementBordereau t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TReglementBordereau.findByBISPARTIEL", query = "SELECT t FROM TReglementBordereau t WHERE t.bISPARTIEL = :bISPARTIEL"),
        @NamedQuery(name = "TReglementBordereau.findByLgMODEREGLEMENT", query = "SELECT t FROM TReglementBordereau t WHERE t.lgMODEREGLEMENT = :lgMODEREGLEMENT"),
        @NamedQuery(name = "TReglementBordereau.findByStrBANQUE", query = "SELECT t FROM TReglementBordereau t WHERE t.strBANQUE = :strBANQUE"),
        @NamedQuery(name = "TReglementBordereau.findByDtDATEREGLEMENT", query = "SELECT t FROM TReglementBordereau t WHERE t.dtDATEREGLEMENT = :dtDATEREGLEMENT"),
        @NamedQuery(name = "TReglementBordereau.findByStrPEREREGLEMENTBRDEREAU", query = "SELECT t FROM TReglementBordereau t WHERE t.strPEREREGLEMENTBRDEREAU = :strPEREREGLEMENTBRDEREAU"),
        @NamedQuery(name = "TReglementBordereau.findByDtCREATED", query = "SELECT t FROM TReglementBordereau t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TReglementBordereau.findByDtUPDATED", query = "SELECT t FROM TReglementBordereau t WHERE t.dtUPDATED = :dtUPDATED") })
public class TReglementBordereau implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_REGLEMENT_BORDEREAU_ID", nullable = false, length = 40)
    private String lgREGLEMENTBORDEREAUID;
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
    @Column(name = "str_PERE_REGLEMENT_BRDEREAU", length = 40)
    private String strPEREREGLEMENTBRDEREAU;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TReglementBordereau() {
    }

    public TReglementBordereau(String lgREGLEMENTBORDEREAUID) {
        this.lgREGLEMENTBORDEREAUID = lgREGLEMENTBORDEREAUID;
    }

    public String getLgREGLEMENTBORDEREAUID() {
        return lgREGLEMENTBORDEREAUID;
    }

    public void setLgREGLEMENTBORDEREAUID(String lgREGLEMENTBORDEREAUID) {
        this.lgREGLEMENTBORDEREAUID = lgREGLEMENTBORDEREAUID;
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

    public String getStrPEREREGLEMENTBRDEREAU() {
        return strPEREREGLEMENTBRDEREAU;
    }

    public void setStrPEREREGLEMENTBRDEREAU(String strPEREREGLEMENTBRDEREAU) {
        this.strPEREREGLEMENTBRDEREAU = strPEREREGLEMENTBRDEREAU;
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
        hash += (lgREGLEMENTBORDEREAUID != null ? lgREGLEMENTBORDEREAUID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TReglementBordereau)) {
            return false;
        }
        TReglementBordereau other = (TReglementBordereau) object;
        if ((this.lgREGLEMENTBORDEREAUID == null && other.lgREGLEMENTBORDEREAUID != null)
                || (this.lgREGLEMENTBORDEREAUID != null
                        && !this.lgREGLEMENTBORDEREAUID.equals(other.lgREGLEMENTBORDEREAUID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TReglementBordereau[ lgREGLEMENTBORDEREAUID=" + lgREGLEMENTBORDEREAUID + " ]";
    }

}
