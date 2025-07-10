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
import javax.persistence.Lob;
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
@Table(name = "t_officine")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TOfficine.findAll", query = "SELECT t FROM TOfficine t"),
        @NamedQuery(name = "TOfficine.findByLgOFFICINEID", query = "SELECT t FROM TOfficine t WHERE t.lgOFFICINEID = :lgOFFICINEID"),
        @NamedQuery(name = "TOfficine.findByLgMEDECINID", query = "SELECT t FROM TOfficine t WHERE t.lgMEDECINID = :lgMEDECINID"),
        @NamedQuery(name = "TOfficine.findByLgVILLEID", query = "SELECT t FROM TOfficine t WHERE t.lgVILLEID = :lgVILLEID"),
        @NamedQuery(name = "TOfficine.findByDtCREATED", query = "SELECT t FROM TOfficine t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TOfficine.findByDtUPDATED", query = "SELECT t FROM TOfficine t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TOfficine.findByStrSTATUT", query = "SELECT t FROM TOfficine t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TOfficine.findByStrFIRSTNAME", query = "SELECT t FROM TOfficine t WHERE t.strFIRSTNAME = :strFIRSTNAME"),
        @NamedQuery(name = "TOfficine.findByStrLASTNAME", query = "SELECT t FROM TOfficine t WHERE t.strLASTNAME = :strLASTNAME"),
        @NamedQuery(name = "TOfficine.findByStrPHONE", query = "SELECT t FROM TOfficine t WHERE t.strPHONE = :strPHONE"),
        @NamedQuery(name = "TOfficine.findByStrCOMPTEBANCAIRE", query = "SELECT t FROM TOfficine t WHERE t.strCOMPTEBANCAIRE = :strCOMPTEBANCAIRE") })
public class TOfficine implements Serializable {

    @Column(name = "str_AUTRESPHONES")
    private String strAUTRESPHONES;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_OFFICINE_ID", nullable = false, length = 40)
    private String lgOFFICINEID;
    @Column(name = "str_NOM_ABREGE")
    private String strNOMABREGE;
    @Column(name = "str_NOM_COMPLET")
    private String strNOMCOMPLET;
    @Column(name = "str_ADRESSSE_POSTALE")
    private String strADRESSSEPOSTALE;
    @Column(name = "lg_MEDECIN_ID", length = 50)
    private String lgMEDECINID;
    @Column(name = "lg_VILLE_ID", length = 40)
    private String lgVILLEID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "str_FIRST_NAME", length = 70)
    private String strFIRSTNAME;
    @Column(name = "str_LAST_NAME", length = 70)
    private String strLASTNAME;
    @Column(name = "str_PHONE", length = 100)
    private String strPHONE;
    @Lob
    @Column(name = "str_COMMENTAIRE1")
    private String strCOMMENTAIRE1;
    @Lob
    @Column(name = "str_COMMENTAIRE2")
    private String strCOMMENTAIRE2;

    @Column(name = "str_ENTETE")
    private String strENTETE;

    @Column(name = "str_COMPTE_CONTRIBUABLE")
    private String strCOMPTECONTRIBUABLE;

    @Column(name = "str_REGISTRE_COMMERCE")
    private String strREGISTRECOMMERCE;

    @Column(name = "str_REGISTRE_IMPOSITION")
    private String strREGISTREIMPOSITION;

    @Column(name = "str_CENTRE_IMPOSITION")
    private String strCENTREIMPOSITION;

    @Column(name = "str_NUM_COMPTABLE")
    private String strNUMCOMPTABLE;

    @Column(name = "str_COMMENTAIREOFFICINE")
    private String strCOMMENTAIREOFFICINE;
    @Column(name = "str_COMPTE_BANCAIRE", length = 100)
    private String strCOMPTEBANCAIRE;

    public TOfficine() {
    }

    public TOfficine(String lgOFFICINEID) {
        this.lgOFFICINEID = lgOFFICINEID;
    }

    public String getLgOFFICINEID() {
        return lgOFFICINEID;
    }

    public void setLgOFFICINEID(String lgOFFICINEID) {
        this.lgOFFICINEID = lgOFFICINEID;
    }

    public String getStrNOMABREGE() {
        return strNOMABREGE;
    }

    public void setStrNOMABREGE(String strNOMABREGE) {
        this.strNOMABREGE = strNOMABREGE;
    }

    public String getStrNOMCOMPLET() {
        return strNOMCOMPLET;
    }

    public void setStrNOMCOMPLET(String strNOMCOMPLET) {
        this.strNOMCOMPLET = strNOMCOMPLET;
    }

    public String getStrADRESSSEPOSTALE() {
        return strADRESSSEPOSTALE;
    }

    public void setStrADRESSSEPOSTALE(String strADRESSSEPOSTALE) {
        this.strADRESSSEPOSTALE = strADRESSSEPOSTALE;
    }

    public String getLgMEDECINID() {
        return lgMEDECINID;
    }

    public void setLgMEDECINID(String lgMEDECINID) {
        this.lgMEDECINID = lgMEDECINID;
    }

    public String getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(String lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
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

    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public void setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
    }

    public String getStrLASTNAME() {
        return strLASTNAME;
    }

    public void setStrLASTNAME(String strLASTNAME) {
        this.strLASTNAME = strLASTNAME;
    }

    public String getStrPHONE() {
        return strPHONE;
    }

    public void setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
    }

    public String getStrCOMMENTAIRE1() {
        return strCOMMENTAIRE1;
    }

    public void setStrCOMMENTAIRE1(String strCOMMENTAIRE1) {
        this.strCOMMENTAIRE1 = strCOMMENTAIRE1;
    }

    public String getStrCOMMENTAIRE2() {
        return strCOMMENTAIRE2;
    }

    public void setStrCOMMENTAIRE2(String strCOMMENTAIRE2) {
        this.strCOMMENTAIRE2 = strCOMMENTAIRE2;
    }

    public String getStrENTETE() {
        return strENTETE;
    }

    public void setStrENTETE(String strENTETE) {
        this.strENTETE = strENTETE;
    }

    public String getStrCOMPTECONTRIBUABLE() {
        return strCOMPTECONTRIBUABLE;
    }

    public void setStrCOMPTECONTRIBUABLE(String strCOMPTECONTRIBUABLE) {
        this.strCOMPTECONTRIBUABLE = strCOMPTECONTRIBUABLE;
    }

    public String getStrREGISTRECOMMERCE() {
        return strREGISTRECOMMERCE;
    }

    public void setStrREGISTRECOMMERCE(String strREGISTRECOMMERCE) {
        this.strREGISTRECOMMERCE = strREGISTRECOMMERCE;
    }

    public String getStrREGISTREIMPOSITION() {
        return strREGISTREIMPOSITION;
    }

    public void setStrREGISTREIMPOSITION(String strREGISTREIMPOSITION) {
        this.strREGISTREIMPOSITION = strREGISTREIMPOSITION;
    }

    public String getStrCENTREIMPOSITION() {
        return strCENTREIMPOSITION;
    }

    public void setStrCENTREIMPOSITION(String strCENTREIMPOSITION) {
        this.strCENTREIMPOSITION = strCENTREIMPOSITION;
    }

    public String getStrNUMCOMPTABLE() {
        return strNUMCOMPTABLE;
    }

    public void setStrNUMCOMPTABLE(String strNUMCOMPTABLE) {
        this.strNUMCOMPTABLE = strNUMCOMPTABLE;
    }

    public String getStrCOMMENTAIREOFFICINE() {
        return strCOMMENTAIREOFFICINE;
    }

    public void setStrCOMMENTAIREOFFICINE(String strCOMMENTAIREOFFICINE) {
        this.strCOMMENTAIREOFFICINE = strCOMMENTAIREOFFICINE;
    }

    public String getStrCOMPTEBANCAIRE() {
        return strCOMPTEBANCAIRE;
    }

    public void setStrCOMPTEBANCAIRE(String strCOMPTEBANCAIRE) {
        this.strCOMPTEBANCAIRE = strCOMPTEBANCAIRE;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgOFFICINEID != null ? lgOFFICINEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TOfficine)) {
            return false;
        }
        TOfficine other = (TOfficine) object;
        if ((this.lgOFFICINEID == null && other.lgOFFICINEID != null)
                || (this.lgOFFICINEID != null && !this.lgOFFICINEID.equals(other.lgOFFICINEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "TOfficine{" + "strAUTRESPHONES=" + strAUTRESPHONES + ", lgOFFICINEID=" + lgOFFICINEID
                + ", strNOMABREGE=" + strNOMABREGE + ", strNOMCOMPLET=" + strNOMCOMPLET + ", strADRESSSEPOSTALE="
                + strADRESSSEPOSTALE + ", lgMEDECINID=" + lgMEDECINID + ", lgVILLEID=" + lgVILLEID + ", dtCREATED="
                + dtCREATED + ", dtUPDATED=" + dtUPDATED + ", strSTATUT=" + strSTATUT + ", strFIRSTNAME=" + strFIRSTNAME
                + ", strLASTNAME=" + strLASTNAME + ", strPHONE=" + strPHONE + ", strCOMMENTAIRE1=" + strCOMMENTAIRE1
                + ", strCOMMENTAIRE2=" + strCOMMENTAIRE2 + ", strENTETE=" + strENTETE + ", strCOMPTECONTRIBUABLE="
                + strCOMPTECONTRIBUABLE + ", strREGISTRECOMMERCE=" + strREGISTRECOMMERCE + ", strREGISTREIMPOSITION="
                + strREGISTREIMPOSITION + ", strCENTREIMPOSITION=" + strCENTREIMPOSITION + ", strNUMCOMPTABLE="
                + strNUMCOMPTABLE + ", strCOMMENTAIREOFFICINE=" + strCOMMENTAIREOFFICINE + ", strCOMPTEBANCAIRE="
                + strCOMPTEBANCAIRE + '}';
    }

    public String getStrAUTRESPHONES() {
        return strAUTRESPHONES;
    }

    public void setStrAUTRESPHONES(String strAUTRESPHONES) {
        this.strAUTRESPHONES = strAUTRESPHONES;
    }

}
