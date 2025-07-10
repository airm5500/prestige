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
@Table(name = "t_fiche_societe")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFicheSociete.findAll", query = "SELECT t FROM TFicheSociete t"),
        @NamedQuery(name = "TFicheSociete.findByLgFICHESOCIETEID", query = "SELECT t FROM TFicheSociete t WHERE t.lgFICHESOCIETEID = :lgFICHESOCIETEID"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEINTERNE", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEINTERNE = :strCODEINTERNE"),
        @NamedQuery(name = "TFicheSociete.findByStrLIBELLEENTREPRISE", query = "SELECT t FROM TFicheSociete t WHERE t.strLIBELLEENTREPRISE = :strLIBELLEENTREPRISE"),
        @NamedQuery(name = "TFicheSociete.findByStrTYPESOCIETE", query = "SELECT t FROM TFicheSociete t WHERE t.strTYPESOCIETE = :strTYPESOCIETE"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEREGROUPEMENT", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEREGROUPEMENT = :strCODEREGROUPEMENT"),
        @NamedQuery(name = "TFicheSociete.findByStrCONTACTSTELEPHONIQUES", query = "SELECT t FROM TFicheSociete t WHERE t.strCONTACTSTELEPHONIQUES = :strCONTACTSTELEPHONIQUES"),
        @NamedQuery(name = "TFicheSociete.findByStrCOMPTECOMPTABLE", query = "SELECT t FROM TFicheSociete t WHERE t.strCOMPTECOMPTABLE = :strCOMPTECOMPTABLE"),
        @NamedQuery(name = "TFicheSociete.findByDblCHIFFREAFFAIRE", query = "SELECT t FROM TFicheSociete t WHERE t.dblCHIFFREAFFAIRE = :dblCHIFFREAFFAIRE"),
        @NamedQuery(name = "TFicheSociete.findByStrDOMICIALIATIONBANCAIRE", query = "SELECT t FROM TFicheSociete t WHERE t.strDOMICIALIATIONBANCAIRE = :strDOMICIALIATIONBANCAIRE"),
        @NamedQuery(name = "TFicheSociete.findByStrRIBSOCIETE", query = "SELECT t FROM TFicheSociete t WHERE t.strRIBSOCIETE = :strRIBSOCIETE"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEEXONERATIONTVA", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEEXONERATIONTVA = :strCODEEXONERATIONTVA"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEREMISE", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEREMISE = :strCODEREMISE"),
        @NamedQuery(name = "TFicheSociete.findByBoolCLIENTENCOMPTE", query = "SELECT t FROM TFicheSociete t WHERE t.boolCLIENTENCOMPTE = :boolCLIENTENCOMPTE"),
        @NamedQuery(name = "TFicheSociete.findByBoolLIVRE", query = "SELECT t FROM TFicheSociete t WHERE t.boolLIVRE = :boolLIVRE"),
        @NamedQuery(name = "TFicheSociete.findByDblREMISESUPPLEMENTAIRE", query = "SELECT t FROM TFicheSociete t WHERE t.dblREMISESUPPLEMENTAIRE = :dblREMISESUPPLEMENTAIRE"),
        @NamedQuery(name = "TFicheSociete.findByDblMONTANTPORT", query = "SELECT t FROM TFicheSociete t WHERE t.dblMONTANTPORT = :dblMONTANTPORT"),
        @NamedQuery(name = "TFicheSociete.findByIntECHEANCEPAIEMENT", query = "SELECT t FROM TFicheSociete t WHERE t.intECHEANCEPAIEMENT = :intECHEANCEPAIEMENT"),
        @NamedQuery(name = "TFicheSociete.findByBoolEDITFACTIONFINVENTE", query = "SELECT t FROM TFicheSociete t WHERE t.boolEDITFACTIONFINVENTE = :boolEDITFACTIONFINVENTE"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEFACTURE", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEFACTURE = :strCODEFACTURE"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEBONLIVRAISON", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEBONLIVRAISON = :strCODEBONLIVRAISON"),
        @NamedQuery(name = "TFicheSociete.findByStrRAISONSOCIALE", query = "SELECT t FROM TFicheSociete t WHERE t.strRAISONSOCIALE = :strRAISONSOCIALE"),
        @NamedQuery(name = "TFicheSociete.findByStrADRESSEPRINCIPALE", query = "SELECT t FROM TFicheSociete t WHERE t.strADRESSEPRINCIPALE = :strADRESSEPRINCIPALE"),
        @NamedQuery(name = "TFicheSociete.findByStrAUTREADRESSE", query = "SELECT t FROM TFicheSociete t WHERE t.strAUTREADRESSE = :strAUTREADRESSE"),
        @NamedQuery(name = "TFicheSociete.findByStrCODEPOSTAL", query = "SELECT t FROM TFicheSociete t WHERE t.strCODEPOSTAL = :strCODEPOSTAL"),
        @NamedQuery(name = "TFicheSociete.findByStrBUREAUDISTRIBUTEUR", query = "SELECT t FROM TFicheSociete t WHERE t.strBUREAUDISTRIBUTEUR = :strBUREAUDISTRIBUTEUR"),
        @NamedQuery(name = "TFicheSociete.findByDtCREATED", query = "SELECT t FROM TFicheSociete t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFicheSociete.findByDtUPDATED", query = "SELECT t FROM TFicheSociete t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TFicheSociete.findByStrSTATUT", query = "SELECT t FROM TFicheSociete t WHERE t.strSTATUT = :strSTATUT") })
public class TFicheSociete implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FICHE_SOCIETE_ID", nullable = false, length = 40)
    private String lgFICHESOCIETEID;
    @Column(name = "str_CODE_INTERNE", length = 40)
    private String strCODEINTERNE;
    @Column(name = "str_LIBELLE_ENTREPRISE", length = 100)
    private String strLIBELLEENTREPRISE;
    @Column(name = "str_TYPE_SOCIETE", length = 100)
    private String strTYPESOCIETE;
    @Column(name = "str_CODE_REGROUPEMENT", length = 40)
    private String strCODEREGROUPEMENT;
    @Column(name = "str_CONTACTS_TELEPHONIQUES", length = 50)
    private String strCONTACTSTELEPHONIQUES;
    @Column(name = "str_COMPTE_COMPTABLE", length = 50)
    private String strCOMPTECOMPTABLE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_CHIFFRE_AFFAIRE", precision = 13, scale = 3)
    private Double dblCHIFFREAFFAIRE;
    @Column(name = "str_DOMICIALIATION_BANCAIRE", length = 50)
    private String strDOMICIALIATIONBANCAIRE;
    @Column(name = "str_RIB_SOCIETE", length = 50)
    private String strRIBSOCIETE;
    @Column(name = "str_CODE_EXONERATION_TVA", length = 40)
    private String strCODEEXONERATIONTVA;
    @Column(name = "str_CODE_REMISE", length = 40)
    private String strCODEREMISE;
    @Column(name = "bool_CLIENT_EN_COMPTE")
    private Boolean boolCLIENTENCOMPTE;
    @Column(name = "bool_LIVRE")
    private Boolean boolLIVRE;
    @Column(name = "dbl_REMISE_SUPPLEMENTAIRE", precision = 13, scale = 3)
    private Double dblREMISESUPPLEMENTAIRE;
    @Column(name = "dbl_MONTANT_PORT", precision = 13, scale = 3)
    private Double dblMONTANTPORT;
    @Column(name = "int_ECHEANCE_PAIEMENT")
    private Integer intECHEANCEPAIEMENT;
    @Column(name = "bool_EDIT_FACTION_FIN_VENTE")
    private Boolean boolEDITFACTIONFINVENTE;
    @Column(name = "str_CODE_FACTURE", length = 40)
    private String strCODEFACTURE;
    @Column(name = "str_CODE_BON_LIVRAISON", length = 40)
    private String strCODEBONLIVRAISON;
    @Column(name = "str_RAISON_SOCIALE", length = 50)
    private String strRAISONSOCIALE;
    @Column(name = "str_ADRESSE_PRINCIPALE", length = 50)
    private String strADRESSEPRINCIPALE;
    @Column(name = "str_AUTRE_ADRESSE", length = 50)
    private String strAUTREADRESSE;
    @Column(name = "str_CODE_POSTAL", length = 50)
    private String strCODEPOSTAL;
    @Column(name = "str_BUREAU_DISTRIBUTEUR", length = 100)
    private String strBUREAUDISTRIBUTEUR;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_ESCOMPTE_SOCIETE_ID", referencedColumnName = "lg_ESCOMPTE_SOCIETE_ID")
    @ManyToOne
    private TEscompteSociete lgESCOMPTESOCIETEID;
    @JoinColumn(name = "lg_VILLE_ID", referencedColumnName = "lg_VILLE_ID")
    @ManyToOne
    private TVille lgVILLEID;

    public TFicheSociete() {
    }

    public TFicheSociete(String lgFICHESOCIETEID) {
        this.lgFICHESOCIETEID = lgFICHESOCIETEID;
    }

    public String getLgFICHESOCIETEID() {
        return lgFICHESOCIETEID;
    }

    public void setLgFICHESOCIETEID(String lgFICHESOCIETEID) {
        this.lgFICHESOCIETEID = lgFICHESOCIETEID;
    }

    public String getStrCODEINTERNE() {
        return strCODEINTERNE;
    }

    public void setStrCODEINTERNE(String strCODEINTERNE) {
        this.strCODEINTERNE = strCODEINTERNE;
    }

    public String getStrLIBELLEENTREPRISE() {
        return strLIBELLEENTREPRISE;
    }

    public void setStrLIBELLEENTREPRISE(String strLIBELLEENTREPRISE) {
        this.strLIBELLEENTREPRISE = strLIBELLEENTREPRISE;
    }

    public String getStrTYPESOCIETE() {
        return strTYPESOCIETE;
    }

    public void setStrTYPESOCIETE(String strTYPESOCIETE) {
        this.strTYPESOCIETE = strTYPESOCIETE;
    }

    public String getStrCODEREGROUPEMENT() {
        return strCODEREGROUPEMENT;
    }

    public void setStrCODEREGROUPEMENT(String strCODEREGROUPEMENT) {
        this.strCODEREGROUPEMENT = strCODEREGROUPEMENT;
    }

    public String getStrCONTACTSTELEPHONIQUES() {
        return strCONTACTSTELEPHONIQUES;
    }

    public void setStrCONTACTSTELEPHONIQUES(String strCONTACTSTELEPHONIQUES) {
        this.strCONTACTSTELEPHONIQUES = strCONTACTSTELEPHONIQUES;
    }

    public String getStrCOMPTECOMPTABLE() {
        return strCOMPTECOMPTABLE;
    }

    public void setStrCOMPTECOMPTABLE(String strCOMPTECOMPTABLE) {
        this.strCOMPTECOMPTABLE = strCOMPTECOMPTABLE;
    }

    public Double getDblCHIFFREAFFAIRE() {
        return dblCHIFFREAFFAIRE;
    }

    public void setDblCHIFFREAFFAIRE(Double dblCHIFFREAFFAIRE) {
        this.dblCHIFFREAFFAIRE = dblCHIFFREAFFAIRE;
    }

    public String getStrDOMICIALIATIONBANCAIRE() {
        return strDOMICIALIATIONBANCAIRE;
    }

    public void setStrDOMICIALIATIONBANCAIRE(String strDOMICIALIATIONBANCAIRE) {
        this.strDOMICIALIATIONBANCAIRE = strDOMICIALIATIONBANCAIRE;
    }

    public String getStrRIBSOCIETE() {
        return strRIBSOCIETE;
    }

    public void setStrRIBSOCIETE(String strRIBSOCIETE) {
        this.strRIBSOCIETE = strRIBSOCIETE;
    }

    public String getStrCODEEXONERATIONTVA() {
        return strCODEEXONERATIONTVA;
    }

    public void setStrCODEEXONERATIONTVA(String strCODEEXONERATIONTVA) {
        this.strCODEEXONERATIONTVA = strCODEEXONERATIONTVA;
    }

    public String getStrCODEREMISE() {
        return strCODEREMISE;
    }

    public void setStrCODEREMISE(String strCODEREMISE) {
        this.strCODEREMISE = strCODEREMISE;
    }

    public Boolean getBoolCLIENTENCOMPTE() {
        return boolCLIENTENCOMPTE;
    }

    public void setBoolCLIENTENCOMPTE(Boolean boolCLIENTENCOMPTE) {
        this.boolCLIENTENCOMPTE = boolCLIENTENCOMPTE;
    }

    public Boolean getBoolLIVRE() {
        return boolLIVRE;
    }

    public void setBoolLIVRE(Boolean boolLIVRE) {
        this.boolLIVRE = boolLIVRE;
    }

    public Double getDblREMISESUPPLEMENTAIRE() {
        return dblREMISESUPPLEMENTAIRE;
    }

    public void setDblREMISESUPPLEMENTAIRE(Double dblREMISESUPPLEMENTAIRE) {
        this.dblREMISESUPPLEMENTAIRE = dblREMISESUPPLEMENTAIRE;
    }

    public Double getDblMONTANTPORT() {
        return dblMONTANTPORT;
    }

    public void setDblMONTANTPORT(Double dblMONTANTPORT) {
        this.dblMONTANTPORT = dblMONTANTPORT;
    }

    public Integer getIntECHEANCEPAIEMENT() {
        return intECHEANCEPAIEMENT;
    }

    public void setIntECHEANCEPAIEMENT(Integer intECHEANCEPAIEMENT) {
        this.intECHEANCEPAIEMENT = intECHEANCEPAIEMENT;
    }

    public Boolean getBoolEDITFACTIONFINVENTE() {
        return boolEDITFACTIONFINVENTE;
    }

    public void setBoolEDITFACTIONFINVENTE(Boolean boolEDITFACTIONFINVENTE) {
        this.boolEDITFACTIONFINVENTE = boolEDITFACTIONFINVENTE;
    }

    public String getStrCODEFACTURE() {
        return strCODEFACTURE;
    }

    public void setStrCODEFACTURE(String strCODEFACTURE) {
        this.strCODEFACTURE = strCODEFACTURE;
    }

    public String getStrCODEBONLIVRAISON() {
        return strCODEBONLIVRAISON;
    }

    public void setStrCODEBONLIVRAISON(String strCODEBONLIVRAISON) {
        this.strCODEBONLIVRAISON = strCODEBONLIVRAISON;
    }

    public String getStrRAISONSOCIALE() {
        return strRAISONSOCIALE;
    }

    public void setStrRAISONSOCIALE(String strRAISONSOCIALE) {
        this.strRAISONSOCIALE = strRAISONSOCIALE;
    }

    public String getStrADRESSEPRINCIPALE() {
        return strADRESSEPRINCIPALE;
    }

    public void setStrADRESSEPRINCIPALE(String strADRESSEPRINCIPALE) {
        this.strADRESSEPRINCIPALE = strADRESSEPRINCIPALE;
    }

    public String getStrAUTREADRESSE() {
        return strAUTREADRESSE;
    }

    public void setStrAUTREADRESSE(String strAUTREADRESSE) {
        this.strAUTREADRESSE = strAUTREADRESSE;
    }

    public String getStrCODEPOSTAL() {
        return strCODEPOSTAL;
    }

    public void setStrCODEPOSTAL(String strCODEPOSTAL) {
        this.strCODEPOSTAL = strCODEPOSTAL;
    }

    public String getStrBUREAUDISTRIBUTEUR() {
        return strBUREAUDISTRIBUTEUR;
    }

    public void setStrBUREAUDISTRIBUTEUR(String strBUREAUDISTRIBUTEUR) {
        this.strBUREAUDISTRIBUTEUR = strBUREAUDISTRIBUTEUR;
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

    public TEscompteSociete getLgESCOMPTESOCIETEID() {
        return lgESCOMPTESOCIETEID;
    }

    public void setLgESCOMPTESOCIETEID(TEscompteSociete lgESCOMPTESOCIETEID) {
        this.lgESCOMPTESOCIETEID = lgESCOMPTESOCIETEID;
    }

    public TVille getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(TVille lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFICHESOCIETEID != null ? lgFICHESOCIETEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFicheSociete)) {
            return false;
        }
        TFicheSociete other = (TFicheSociete) object;
        if ((this.lgFICHESOCIETEID == null && other.lgFICHESOCIETEID != null)
                || (this.lgFICHESOCIETEID != null && !this.lgFICHESOCIETEID.equals(other.lgFICHESOCIETEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFicheSociete[ lgFICHESOCIETEID=" + lgFICHESOCIETEID + " ]";
    }

}
