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
import toolkits.utils.date;

/**
 *
 * @author JZAGO
 */
@Entity
@Table(name = "t_litige")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TLitige.findAll", query = "SELECT t FROM TLitige t"),
        @NamedQuery(name = "TLitige.findByLgLITIGEID", query = "SELECT t FROM TLitige t WHERE t.lgLITIGEID = :lgLITIGEID"),
        @NamedQuery(name = "TLitige.findByStrCLIENTNAME", query = "SELECT t FROM TLitige t WHERE t.strCLIENTNAME = :strCLIENTNAME"),
        @NamedQuery(name = "TLitige.findByStrREFERENCEVENTELITIGE", query = "SELECT t FROM TLitige t WHERE t.strREFERENCEVENTELITIGE = :strREFERENCEVENTELITIGE"),
        @NamedQuery(name = "TLitige.findByStrLIBELLELITIGE", query = "SELECT t FROM TLitige t WHERE t.strLIBELLELITIGE = :strLIBELLELITIGE"),
        @NamedQuery(name = "TLitige.findByStrETATLITIGE", query = "SELECT t FROM TLitige t WHERE t.strETATLITIGE = :strETATLITIGE"),
        @NamedQuery(name = "TLitige.findByStrCOMMENTAIRELITIGE", query = "SELECT t FROM TLitige t WHERE t.strCOMMENTAIRELITIGE = :strCOMMENTAIRELITIGE"),
        @NamedQuery(name = "TLitige.findByStrCONSEQUENCELITIGE", query = "SELECT t FROM TLitige t WHERE t.strCONSEQUENCELITIGE = :strCONSEQUENCELITIGE"),
        @NamedQuery(name = "TLitige.findByIntAMOUNTTOTALLITIGE", query = "SELECT t FROM TLitige t WHERE t.intAMOUNTTOTALLITIGE = :intAMOUNTTOTALLITIGE"),
        @NamedQuery(name = "TLitige.findByIntAMOUNTDUSLITIGE", query = "SELECT t FROM TLitige t WHERE t.intAMOUNTDUSLITIGE = :intAMOUNTDUSLITIGE"),
        @NamedQuery(name = "TLitige.findByIntAMOUNTPAYELITIGE", query = "SELECT t FROM TLitige t WHERE t.intAMOUNTPAYELITIGE = :intAMOUNTPAYELITIGE"),
        @NamedQuery(name = "TLitige.findByStrDESCRIPTIONLITIGE", query = "SELECT t FROM TLitige t WHERE t.strDESCRIPTIONLITIGE = :strDESCRIPTIONLITIGE"),
        @NamedQuery(name = "TLitige.findByDtCREATEDLITIGE", query = "SELECT t FROM TLitige t WHERE t.dtCREATEDLITIGE = :dtCREATEDLITIGE"),
        @NamedQuery(name = "TLitige.findByDtUPDATEDLITIGE", query = "SELECT t FROM TLitige t WHERE t.dtUPDATEDLITIGE = :dtUPDATEDLITIGE") })
public class TLitige implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_LITIGE_ID")
    private String lgLITIGEID;
    @Basic(optional = false)
    @Column(name = "str_CLIENT_NAME")
    private String strCLIENTNAME;
    @Basic(optional = false)
    @Column(name = "str_REFERENCE_VENTE_LITIGE")
    private String strREFERENCEVENTELITIGE;
    @Basic(optional = false)
    @Column(name = "str_LIBELLE_LITIGE")
    private String strLIBELLELITIGE;
    @Basic(optional = false)
    @Column(name = "str_ETAT_LITIGE")
    private String strETATLITIGE;
    @Column(name = "str_COMMENTAIRE_LITIGE")
    private String strCOMMENTAIRELITIGE;
    @Basic(optional = false)
    @Column(name = "str_CONSEQUENCE_LITIGE")
    private String strCONSEQUENCELITIGE;
    @Column(name = "int_AMOUNT_TOTAL_LITIGE")
    private Integer intAMOUNTTOTALLITIGE;
    @Column(name = "int_AMOUNT_DUS_LITIGE")
    private Integer intAMOUNTDUSLITIGE;
    @Column(name = "int_AMOUNT_PAYE_LITIGE")
    private Integer intAMOUNTPAYELITIGE;
    @Basic(optional = false)
    @Column(name = "str_DESCRIPTION_LITIGE")
    private String strDESCRIPTIONLITIGE;
    @Column(name = "dt_CREATED_LITIGE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATEDLITIGE;
    @Column(name = "dt_UPDATED_LITIGE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATEDLITIGE;
    @JoinColumn(name = "lg_TIERS_PAYANT_ID", referencedColumnName = "lg_TIERS_PAYANT_ID")
    @ManyToOne(optional = false)
    private TTiersPayant lgTIERSPAYANTID;
    @JoinColumn(name = "lg_TYPELITIGE_ID", referencedColumnName = "lg_TYPELITIGE_ID")
    @ManyToOne(optional = false)
    private TTypelitige lgTYPELITIGEID;

    public TLitige() {
        // this.lgLITIGEID = new date().getComplexId();
    }

    public TLitige(String strCLIENTNAME, String strREFERENCEVENTELITIGE, String strLIBELLELITIGE, String strETATLITIGE,
            String strCONSEQUENCELITIGE, String strDESCRIPTIONLITIGE) {
        this.lgLITIGEID = new date().getComplexId();
        this.strCLIENTNAME = strCLIENTNAME;
        this.strREFERENCEVENTELITIGE = strREFERENCEVENTELITIGE;
        this.strLIBELLELITIGE = strLIBELLELITIGE;
        this.strETATLITIGE = strETATLITIGE;
        this.strCONSEQUENCELITIGE = strCONSEQUENCELITIGE;
        this.strDESCRIPTIONLITIGE = strDESCRIPTIONLITIGE;

    }

    public String getLgLITIGEID() {
        return lgLITIGEID;
    }

    public void setLgLITIGEID(String lgLITIGEID) {
        this.lgLITIGEID = lgLITIGEID;
    }

    public String getStrCLIENTNAME() {
        return strCLIENTNAME;
    }

    public void setStrCLIENTNAME(String strCLIENTNAME) {
        this.strCLIENTNAME = strCLIENTNAME;
    }

    public String getStrREFERENCEVENTELITIGE() {
        return strREFERENCEVENTELITIGE;
    }

    public void setStrREFERENCEVENTELITIGE(String strREFERENCEVENTELITIGE) {
        this.strREFERENCEVENTELITIGE = strREFERENCEVENTELITIGE;
    }

    public String getStrLIBELLELITIGE() {
        return strLIBELLELITIGE;
    }

    public void setStrLIBELLELITIGE(String strLIBELLELITIGE) {
        this.strLIBELLELITIGE = strLIBELLELITIGE;
    }

    public String getStrETATLITIGE() {
        return strETATLITIGE;
    }

    public void setStrETATLITIGE(String strETATLITIGE) {
        this.strETATLITIGE = strETATLITIGE;
    }

    public String getStrCOMMENTAIRELITIGE() {
        return strCOMMENTAIRELITIGE;
    }

    public void setStrCOMMENTAIRELITIGE(String strCOMMENTAIRELITIGE) {
        this.strCOMMENTAIRELITIGE = strCOMMENTAIRELITIGE;
    }

    public String getStrCONSEQUENCELITIGE() {
        return strCONSEQUENCELITIGE;
    }

    public void setStrCONSEQUENCELITIGE(String strCONSEQUENCELITIGE) {
        this.strCONSEQUENCELITIGE = strCONSEQUENCELITIGE;
    }

    public Integer getIntAMOUNTTOTALLITIGE() {
        return intAMOUNTTOTALLITIGE;
    }

    public void setIntAMOUNTTOTALLITIGE(Integer intAMOUNTTOTALLITIGE) {
        this.intAMOUNTTOTALLITIGE = intAMOUNTTOTALLITIGE;
    }

    public Integer getIntAMOUNTDUSLITIGE() {
        return intAMOUNTDUSLITIGE;
    }

    public void setIntAMOUNTDUSLITIGE(Integer intAMOUNTDUSLITIGE) {
        this.intAMOUNTDUSLITIGE = intAMOUNTDUSLITIGE;
    }

    public Integer getIntAMOUNTPAYELITIGE() {
        return intAMOUNTPAYELITIGE;
    }

    public void setIntAMOUNTPAYELITIGE(Integer intAMOUNTPAYELITIGE) {
        this.intAMOUNTPAYELITIGE = intAMOUNTPAYELITIGE;
    }

    public String getStrDESCRIPTIONLITIGE() {
        return strDESCRIPTIONLITIGE;
    }

    public void setStrDESCRIPTIONLITIGE(String strDESCRIPTIONLITIGE) {
        this.strDESCRIPTIONLITIGE = strDESCRIPTIONLITIGE;
    }

    public Date getDtCREATEDLITIGE() {
        return dtCREATEDLITIGE;
    }

    public void setDtCREATEDLITIGE(Date dtCREATEDLITIGE) {
        this.dtCREATEDLITIGE = dtCREATEDLITIGE;
    }

    public Date getDtUPDATEDLITIGE() {
        return dtUPDATEDLITIGE;
    }

    public void setDtUPDATEDLITIGE(Date dtUPDATEDLITIGE) {
        this.dtUPDATEDLITIGE = dtUPDATEDLITIGE;
    }

    public TTiersPayant getLgTIERSPAYANTID() {
        return lgTIERSPAYANTID;
    }

    public void setLgTIERSPAYANTID(TTiersPayant lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    public TTypelitige getLgTYPELITIGEID() {
        return lgTYPELITIGEID;
    }

    public void setLgTYPELITIGEID(TTypelitige lgTYPELITIGEID) {
        this.lgTYPELITIGEID = lgTYPELITIGEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgLITIGEID != null ? lgLITIGEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TLitige)) {
            return false;
        }
        TLitige other = (TLitige) object;
        if ((this.lgLITIGEID == null && other.lgLITIGEID != null)
                || (this.lgLITIGEID != null && !this.lgLITIGEID.equals(other.lgLITIGEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TLitige[ lgLITIGEID=" + lgLITIGEID + " ]";
    }

}
