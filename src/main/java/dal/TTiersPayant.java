/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Objects;
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
import javax.persistence.Transient;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;
import org.apache.commons.collections4.CollectionUtils;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_tiers_payant")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTiersPayant.findAll", query = "SELECT t FROM TTiersPayant t"),
        @NamedQuery(name = "TTiersPayant.findByLgTIERSPAYANTID", query = "SELECT t FROM TTiersPayant t WHERE t.lgTIERSPAYANTID = :lgTIERSPAYANTID"),
        @NamedQuery(name = "TTiersPayant.findByStrCODEORGANISME", query = "SELECT t FROM TTiersPayant t WHERE t.strCODEORGANISME = :strCODEORGANISME"),
        @NamedQuery(name = "TTiersPayant.findByStrNAME", query = "SELECT t FROM TTiersPayant t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTiersPayant.findByStrFULLNAME", query = "SELECT t FROM TTiersPayant t WHERE t.strFULLNAME = :strFULLNAME"),
        @NamedQuery(name = "TTiersPayant.findByStrMOBILE", query = "SELECT t FROM TTiersPayant t WHERE t.strMOBILE = :strMOBILE"),
        @NamedQuery(name = "TTiersPayant.findByStrTELEPHONE", query = "SELECT t FROM TTiersPayant t WHERE t.strTELEPHONE = :strTELEPHONE"),
        @NamedQuery(name = "TTiersPayant.findByStrMAIL", query = "SELECT t FROM TTiersPayant t WHERE t.strMAIL = :strMAIL"),
        @NamedQuery(name = "TTiersPayant.findByDblPLAFONDCREDIT", query = "SELECT t FROM TTiersPayant t WHERE t.dblPLAFONDCREDIT = :dblPLAFONDCREDIT"),
        @NamedQuery(name = "TTiersPayant.findByDblTAUXREMBOURSEMENT", query = "SELECT t FROM TTiersPayant t WHERE t.dblTAUXREMBOURSEMENT = :dblTAUXREMBOURSEMENT"),
        @NamedQuery(name = "TTiersPayant.findByStrNUMEROCAISSEOFFICIEL", query = "SELECT t FROM TTiersPayant t WHERE t.strNUMEROCAISSEOFFICIEL = :strNUMEROCAISSEOFFICIEL"),
        @NamedQuery(name = "TTiersPayant.findByStrCENTREPAYEUR", query = "SELECT t FROM TTiersPayant t WHERE t.strCENTREPAYEUR = :strCENTREPAYEUR"),
        @NamedQuery(name = "TTiersPayant.findByStrCODEREGROUPEMENT", query = "SELECT t FROM TTiersPayant t WHERE t.strCODEREGROUPEMENT = :strCODEREGROUPEMENT"),
        @NamedQuery(name = "TTiersPayant.findByDblSEUILMINIMUM", query = "SELECT t FROM TTiersPayant t WHERE t.dblSEUILMINIMUM = :dblSEUILMINIMUM"),
        @NamedQuery(name = "TTiersPayant.findByBoolINTERDICTION", query = "SELECT t FROM TTiersPayant t WHERE t.boolINTERDICTION = :boolINTERDICTION"),
        @NamedQuery(name = "TTiersPayant.findByBoolIsACCOUNT", query = "SELECT t FROM TTiersPayant t WHERE t.boolIsACCOUNT = :boolIsACCOUNT"),
        @NamedQuery(name = "TTiersPayant.findByStrCODECOMPTABLE", query = "SELECT t FROM TTiersPayant t WHERE t.strCODECOMPTABLE = :strCODECOMPTABLE"),
        @NamedQuery(name = "TTiersPayant.findByBoolPRENUMFACTSUBROGATOIRE", query = "SELECT t FROM TTiersPayant t WHERE t.boolPRENUMFACTSUBROGATOIRE = :boolPRENUMFACTSUBROGATOIRE"),
        @NamedQuery(name = "TTiersPayant.findByIntNUMERODECOMPTE", query = "SELECT t FROM TTiersPayant t WHERE t.intNUMERODECOMPTE = :intNUMERODECOMPTE"),
        @NamedQuery(name = "TTiersPayant.findByStrCODEPAIEMENT", query = "SELECT t FROM TTiersPayant t WHERE t.strCODEPAIEMENT = :strCODEPAIEMENT"),
        @NamedQuery(name = "TTiersPayant.findByDtDELAIPAIEMENT", query = "SELECT t FROM TTiersPayant t WHERE t.dtDELAIPAIEMENT = :dtDELAIPAIEMENT"),
        @NamedQuery(name = "TTiersPayant.findByDblPOURCENTAGEREMISE", query = "SELECT t FROM TTiersPayant t WHERE t.dblPOURCENTAGEREMISE = :dblPOURCENTAGEREMISE"),
        @NamedQuery(name = "TTiersPayant.findByDblREMISEFORFETAIRE", query = "SELECT t FROM TTiersPayant t WHERE t.dblREMISEFORFETAIRE = :dblREMISEFORFETAIRE"),
        @NamedQuery(name = "TTiersPayant.findByStrCODEEDITBORDEREAU", query = "SELECT t FROM TTiersPayant t WHERE t.strCODEEDITBORDEREAU = :strCODEEDITBORDEREAU"),
        @NamedQuery(name = "TTiersPayant.findByIntNBREEXEMPLAIREBORD", query = "SELECT t FROM TTiersPayant t WHERE t.intNBREEXEMPLAIREBORD = :intNBREEXEMPLAIREBORD"),
        @NamedQuery(name = "TTiersPayant.findByIntPERIODICITEEDITBORD", query = "SELECT t FROM TTiersPayant t WHERE t.intPERIODICITEEDITBORD = :intPERIODICITEEDITBORD"),
        @NamedQuery(name = "TTiersPayant.findByIntDATEDERNIEREEDITION", query = "SELECT t FROM TTiersPayant t WHERE t.intDATEDERNIEREEDITION = :intDATEDERNIEREEDITION"),
        @NamedQuery(name = "TTiersPayant.findByStrNUMEROIDFORGANISME", query = "SELECT t FROM TTiersPayant t WHERE t.strNUMEROIDFORGANISME = :strNUMEROIDFORGANISME"),
        @NamedQuery(name = "TTiersPayant.findByDblMONTANTFCLIENT", query = "SELECT t FROM TTiersPayant t WHERE t.dblMONTANTFCLIENT = :dblMONTANTFCLIENT"),
        @NamedQuery(name = "TTiersPayant.findByDblBASEREMISE", query = "SELECT t FROM TTiersPayant t WHERE t.dblBASEREMISE = :dblBASEREMISE"),
        @NamedQuery(name = "TTiersPayant.findByStrCODEDOCCOMPTOIRE", query = "SELECT t FROM TTiersPayant t WHERE t.strCODEDOCCOMPTOIRE = :strCODEDOCCOMPTOIRE"),
        @NamedQuery(name = "TTiersPayant.findByBoolENABLED", query = "SELECT t FROM TTiersPayant t WHERE t.boolENABLED = :boolENABLED"),
        @NamedQuery(name = "TTiersPayant.findByDtCREATED", query = "SELECT t FROM TTiersPayant t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTiersPayant.findByDtUPDATED", query = "SELECT t FROM TTiersPayant t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTiersPayant.findByStrSTATUT", query = "SELECT t FROM TTiersPayant t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTiersPayant.findByStrPHOTO", query = "SELECT t FROM TTiersPayant t WHERE t.strPHOTO = :strPHOTO"),
        @NamedQuery(name = "TTiersPayant.findByStrREGISTRECOMMERCE", query = "SELECT t FROM TTiersPayant t WHERE t.strREGISTRECOMMERCE = :strREGISTRECOMMERCE"),
        @NamedQuery(name = "TTiersPayant.findByStrCODEOFFICINE", query = "SELECT t FROM TTiersPayant t WHERE t.strCODEOFFICINE = :strCODEOFFICINE"),
        @NamedQuery(name = "TTiersPayant.findByStrCOMPTECONTRIBUABLE", query = "SELECT t FROM TTiersPayant t WHERE t.strCOMPTECONTRIBUABLE = :strCOMPTECONTRIBUABLE") })
public class TTiersPayant implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TIERS_PAYANT_ID", nullable = false, length = 40)
    private String lgTIERSPAYANTID;

    @Column(name = "int_NBREBONS")
    private Integer intNBREBONS;
    @Column(name = "int_MONTANTFAC")
    private Integer intMONTANTFAC;
    @JoinColumn(name = "lg_GROUPE_ID", referencedColumnName = "lg_GROUPE_ID")
    @ManyToOne
    private TGroupeTierspayant lgGROUPEID;
    @Column(name = "b_CANBEUSE")
    private Boolean bCANBEUSE;

    @Column(name = "db_CONSOMMATION_MENSUELLE")
    private Integer dbCONSOMMATIONMENSUELLE;
    @Column(name = "b_IsAbsolute")
    private Boolean bIsAbsolute;

    @OneToMany(mappedBy = "lgTIERSPAYANTID")
    private Collection<TLitige> tLitigeCollection;

    @Column(name = "str_CODE_ORGANISME", length = 40)
    private String strCODEORGANISME;
    @Column(name = "str_NAME", length = 100)
    private String strNAME;
    @Column(name = "str_FULLNAME", length = 100)
    private String strFULLNAME;

    @Column(name = "str_ADRESSE", length = 100)
    private String strADRESSE;
    @Column(name = "str_MOBILE", length = 50)
    private String strMOBILE;
    @Column(name = "str_TELEPHONE", length = 50)
    private String strTELEPHONE;
    @Column(name = "str_MAIL", length = 100)
    private String strMAIL;
    @Column(name = "dbl_PLAFOND_CREDIT", precision = 12, scale = 2)
    private Double dblPLAFONDCREDIT;
    @Column(name = "dbl_TAUX_REMBOURSEMENT", precision = 5, scale = 2)
    private Double dblTAUXREMBOURSEMENT;
    @Column(name = "str_NUMERO_CAISSE_OFFICIEL", length = 40)
    private String strNUMEROCAISSEOFFICIEL;
    @Column(name = "str_CENTRE_PAYEUR", length = 50)
    private String strCENTREPAYEUR;
    @Column(name = "str_CODE_REGROUPEMENT", length = 40)
    private String strCODEREGROUPEMENT;
    @Column(name = "dbl_SEUIL_MINIMUM", precision = 12, scale = 2)
    private Double dblSEUILMINIMUM;
    @Column(name = "bool_INTERDICTION")
    private Boolean boolINTERDICTION;
    @Column(name = "bool_IsACCOUNT")
    private Boolean boolIsACCOUNT;
    @Column(name = "str_CODE_COMPTABLE", length = 40)
    private String strCODECOMPTABLE;
    @Column(name = "bool_PRENUM_FACT_SUBROGATOIRE")
    private Boolean boolPRENUMFACTSUBROGATOIRE;
    @Column(name = "int_NUMERO_DECOMPTE")
    private Integer intNUMERODECOMPTE;
    @Column(name = "str_CODE_PAIEMENT", length = 40)
    private String strCODEPAIEMENT;
    @Column(name = "dt_DELAI_PAIEMENT")
    private Integer dtDELAIPAIEMENT;
    @Column(name = "dbl_POURCENTAGE_REMISE", precision = 5, scale = 2)
    private Double dblPOURCENTAGEREMISE;
    @Column(name = "dbl_REMISE_FORFETAIRE", precision = 12, scale = 2)
    private Double dblREMISEFORFETAIRE;
    @Column(name = "str_CODE_EDIT_BORDEREAU", length = 40)
    private String strCODEEDITBORDEREAU;
    @Column(name = "int_NBRE_EXEMPLAIRE_BORD")
    private Integer intNBREEXEMPLAIREBORD;
    @Column(name = "int_PERIODICITE_EDIT_BORD")
    private Integer intPERIODICITEEDITBORD;
    @Column(name = "int_DATE_DERNIERE_EDITION")
    private Integer intDATEDERNIEREEDITION;
    @Column(name = "str_NUMERO_IDF_ORGANISME", length = 40)
    private String strNUMEROIDFORGANISME;
    @Column(name = "dbl_MONTANT_F_CLIENT", precision = 12, scale = 2)
    private Double dblMONTANTFCLIENT;
    @Column(name = "dbl_BASE_REMISE", precision = 12, scale = 2)
    private Double dblBASEREMISE;
    @Column(name = "str_CODE_DOC_COMPTOIRE", length = 40)
    private String strCODEDOCCOMPTOIRE;
    @Column(name = "bool_ENABLED")
    private Boolean boolENABLED;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "str_PHOTO", length = 40)
    private String strPHOTO;
    @Column(name = "str_REGISTRE_COMMERCE", length = 100)
    private String strREGISTRECOMMERCE;
    @Column(name = "str_CODE_OFFICINE", length = 100)
    private String strCODEOFFICINE;
    @Column(name = "str_COMPTE_CONTRIBUABLE", length = 100)
    private String strCOMPTECONTRIBUABLE;
    @JoinColumn(name = "lg_SEQUENCIER_ID", referencedColumnName = "lg_SEQUENCIER_ID")
    @ManyToOne
    private TSequencier lgSEQUENCIERID;
    @JoinColumn(name = "lg_RISQUE_ID", referencedColumnName = "lg_RISQUE_ID")
    @ManyToOne
    private TRisque lgRISQUEID;
    @JoinColumn(name = "lg_REGIME_CAISSE_ID", referencedColumnName = "lg_REGIMECAISSE_ID")
    @ManyToOne
    private TRegimeCaisse lgREGIMECAISSEID;
    @JoinColumn(name = "lg_TYPE_CONTRAT_ID", referencedColumnName = "lg_TYPE_CONTRAT_ID")
    @ManyToOne
    private TTypeContrat lgTYPECONTRATID;
    @JoinColumn(name = "lg_TYPE_TIERS_PAYANT_ID", referencedColumnName = "lg_TYPE_TIERS_PAYANT_ID")
    @ManyToOne
    private TTypeTiersPayant lgTYPETIERSPAYANTID;
    @JoinColumn(name = "lg_VILLE_ID", referencedColumnName = "lg_VILLE_ID")
    @ManyToOne
    private TVille lgVILLEID;
    @JoinColumn(name = "lg_MODEL_FACTURE_ID", referencedColumnName = "lg_MODEL_FACTURE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TModelFacture lgMODELFACTUREID;
    @OneToMany(mappedBy = "lgTIERSPAYANTID")
    private Collection<TCompteClientTiersPayant> tCompteClientTiersPayantCollection;
    @Column(name = "account")
    private Long account = 0L;
    @Column(name = "to_be_exclude")
    private Boolean toBeExclude = Boolean.FALSE;
    @Column(name = "is_depot", nullable = false)
    private Boolean isDepot = Boolean.FALSE;
    @Column(name = "grouping_by_taux", nullable = false)
    private Boolean groupingByTaux = Boolean.FALSE;

    @Column(name = "regime_imposition")
    private String regimeImposition;

    @OneToMany(mappedBy = "tiersPayant")
    private List<Caution> cautions = new ArrayList<>();
    @Transient
    private Caution caution;

    public List<Caution> getCautions() {
        return cautions;
    }

    public void setCautions(List<Caution> cautions) {
        this.cautions = cautions;
    }

    public Boolean getGroupingByTaux() {
        return groupingByTaux;
    }

    public void setGroupingByTaux(Boolean groupingByTaux) {
        this.groupingByTaux = groupingByTaux;
    }

    public String getRegimeImposition() {
        return regimeImposition;
    }

    public void setRegimeImposition(String regimeImposition) {
        this.regimeImposition = regimeImposition;
    }

    public TTiersPayant() {
    }

    public TTiersPayant(String lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    public String getLgTIERSPAYANTID() {
        return lgTIERSPAYANTID;
    }

    public void setLgTIERSPAYANTID(String lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    public String getStrCODEORGANISME() {
        return strCODEORGANISME;
    }

    public void setStrCODEORGANISME(String strCODEORGANISME) {
        this.strCODEORGANISME = strCODEORGANISME;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrFULLNAME() {
        return strFULLNAME;
    }

    public void setStrFULLNAME(String strFULLNAME) {
        this.strFULLNAME = strFULLNAME;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getStrMOBILE() {
        return strMOBILE;
    }

    public void setStrMOBILE(String strMOBILE) {
        this.strMOBILE = strMOBILE;
    }

    public String getStrTELEPHONE() {
        return strTELEPHONE;
    }

    public void setStrTELEPHONE(String strTELEPHONE) {
        this.strTELEPHONE = strTELEPHONE;
    }

    public String getStrMAIL() {
        return strMAIL;
    }

    public void setStrMAIL(String strMAIL) {
        this.strMAIL = strMAIL;
    }

    public Double getDblPLAFONDCREDIT() {
        return dblPLAFONDCREDIT;
    }

    public void setDblPLAFONDCREDIT(Double dblPLAFONDCREDIT) {
        this.dblPLAFONDCREDIT = dblPLAFONDCREDIT;
    }

    public Double getDblTAUXREMBOURSEMENT() {
        return dblTAUXREMBOURSEMENT;
    }

    public void setDblTAUXREMBOURSEMENT(Double dblTAUXREMBOURSEMENT) {
        this.dblTAUXREMBOURSEMENT = dblTAUXREMBOURSEMENT;
    }

    public String getStrNUMEROCAISSEOFFICIEL() {
        return strNUMEROCAISSEOFFICIEL;
    }

    public void setStrNUMEROCAISSEOFFICIEL(String strNUMEROCAISSEOFFICIEL) {
        this.strNUMEROCAISSEOFFICIEL = strNUMEROCAISSEOFFICIEL;
    }

    public String getStrCENTREPAYEUR() {
        return strCENTREPAYEUR;
    }

    public void setStrCENTREPAYEUR(String strCENTREPAYEUR) {
        this.strCENTREPAYEUR = strCENTREPAYEUR;
    }

    public String getStrCODEREGROUPEMENT() {
        return strCODEREGROUPEMENT;
    }

    public void setStrCODEREGROUPEMENT(String strCODEREGROUPEMENT) {
        this.strCODEREGROUPEMENT = strCODEREGROUPEMENT;
    }

    public Double getDblSEUILMINIMUM() {
        return dblSEUILMINIMUM;
    }

    public void setDblSEUILMINIMUM(Double dblSEUILMINIMUM) {
        this.dblSEUILMINIMUM = dblSEUILMINIMUM;
    }

    public Boolean getBoolINTERDICTION() {
        return boolINTERDICTION;
    }

    public void setBoolINTERDICTION(Boolean boolINTERDICTION) {
        this.boolINTERDICTION = boolINTERDICTION;
    }

    public Boolean getBoolIsACCOUNT() {
        return boolIsACCOUNT;
    }

    public void setBoolIsACCOUNT(Boolean boolIsACCOUNT) {
        this.boolIsACCOUNT = boolIsACCOUNT;
    }

    public String getStrCODECOMPTABLE() {
        return strCODECOMPTABLE;
    }

    public void setStrCODECOMPTABLE(String strCODECOMPTABLE) {
        this.strCODECOMPTABLE = strCODECOMPTABLE;
    }

    public Boolean getBoolPRENUMFACTSUBROGATOIRE() {
        return boolPRENUMFACTSUBROGATOIRE;
    }

    public void setBoolPRENUMFACTSUBROGATOIRE(Boolean boolPRENUMFACTSUBROGATOIRE) {
        this.boolPRENUMFACTSUBROGATOIRE = boolPRENUMFACTSUBROGATOIRE;
    }

    public Integer getIntNUMERODECOMPTE() {
        return intNUMERODECOMPTE;
    }

    public void setIntNUMERODECOMPTE(Integer intNUMERODECOMPTE) {
        this.intNUMERODECOMPTE = intNUMERODECOMPTE;
    }

    public String getStrCODEPAIEMENT() {
        return strCODEPAIEMENT;
    }

    public void setStrCODEPAIEMENT(String strCODEPAIEMENT) {
        this.strCODEPAIEMENT = strCODEPAIEMENT;
    }

    public Integer getDtDELAIPAIEMENT() {
        return dtDELAIPAIEMENT;
    }

    public void setDtDELAIPAIEMENT(Integer dtDELAIPAIEMENT) {
        this.dtDELAIPAIEMENT = dtDELAIPAIEMENT;
    }

    public Double getDblPOURCENTAGEREMISE() {
        return dblPOURCENTAGEREMISE;
    }

    public void setDblPOURCENTAGEREMISE(Double dblPOURCENTAGEREMISE) {
        this.dblPOURCENTAGEREMISE = dblPOURCENTAGEREMISE;
    }

    public Double getDblREMISEFORFETAIRE() {
        return dblREMISEFORFETAIRE;
    }

    public void setDblREMISEFORFETAIRE(Double dblREMISEFORFETAIRE) {
        this.dblREMISEFORFETAIRE = dblREMISEFORFETAIRE;
    }

    public String getStrCODEEDITBORDEREAU() {
        return strCODEEDITBORDEREAU;
    }

    public void setStrCODEEDITBORDEREAU(String strCODEEDITBORDEREAU) {
        this.strCODEEDITBORDEREAU = strCODEEDITBORDEREAU;
    }

    public Integer getIntNBREEXEMPLAIREBORD() {
        return intNBREEXEMPLAIREBORD;
    }

    public void setIntNBREEXEMPLAIREBORD(Integer intNBREEXEMPLAIREBORD) {
        this.intNBREEXEMPLAIREBORD = intNBREEXEMPLAIREBORD;
    }

    public Integer getIntPERIODICITEEDITBORD() {
        return intPERIODICITEEDITBORD;
    }

    public void setIntPERIODICITEEDITBORD(Integer intPERIODICITEEDITBORD) {
        this.intPERIODICITEEDITBORD = intPERIODICITEEDITBORD;
    }

    public Integer getIntDATEDERNIEREEDITION() {
        return intDATEDERNIEREEDITION;
    }

    public void setIntDATEDERNIEREEDITION(Integer intDATEDERNIEREEDITION) {
        this.intDATEDERNIEREEDITION = intDATEDERNIEREEDITION;
    }

    public String getStrNUMEROIDFORGANISME() {
        return strNUMEROIDFORGANISME;
    }

    public void setStrNUMEROIDFORGANISME(String strNUMEROIDFORGANISME) {
        this.strNUMEROIDFORGANISME = strNUMEROIDFORGANISME;
    }

    public Double getDblMONTANTFCLIENT() {
        return dblMONTANTFCLIENT;
    }

    public void setDblMONTANTFCLIENT(Double dblMONTANTFCLIENT) {
        this.dblMONTANTFCLIENT = dblMONTANTFCLIENT;
    }

    public Double getDblBASEREMISE() {
        return dblBASEREMISE;
    }

    public void setDblBASEREMISE(Double dblBASEREMISE) {
        this.dblBASEREMISE = dblBASEREMISE;
    }

    public String getStrCODEDOCCOMPTOIRE() {
        return strCODEDOCCOMPTOIRE;
    }

    public void setStrCODEDOCCOMPTOIRE(String strCODEDOCCOMPTOIRE) {
        this.strCODEDOCCOMPTOIRE = strCODEDOCCOMPTOIRE;
    }

    public Boolean getBoolENABLED() {
        return boolENABLED;
    }

    public void setBoolENABLED(Boolean boolENABLED) {
        this.boolENABLED = boolENABLED;
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

    public String getStrPHOTO() {
        return strPHOTO;
    }

    public void setStrPHOTO(String strPHOTO) {
        this.strPHOTO = strPHOTO;
    }

    public String getStrREGISTRECOMMERCE() {
        return strREGISTRECOMMERCE;
    }

    public void setStrREGISTRECOMMERCE(String strREGISTRECOMMERCE) {
        this.strREGISTRECOMMERCE = strREGISTRECOMMERCE;
    }

    public String getStrCODEOFFICINE() {
        return strCODEOFFICINE;
    }

    public void setStrCODEOFFICINE(String strCODEOFFICINE) {
        this.strCODEOFFICINE = strCODEOFFICINE;
    }

    public String getStrCOMPTECONTRIBUABLE() {
        return strCOMPTECONTRIBUABLE;
    }

    public void setStrCOMPTECONTRIBUABLE(String strCOMPTECONTRIBUABLE) {
        this.strCOMPTECONTRIBUABLE = strCOMPTECONTRIBUABLE;
    }

    @XmlTransient
    public Collection<TLitige> getTLitigeCollection() {
        return tLitigeCollection;
    }

    public void setTLitigeCollection(Collection<TLitige> tLitigeCollection) {
        this.tLitigeCollection = tLitigeCollection;
    }

    public TSequencier getLgSEQUENCIERID() {
        return lgSEQUENCIERID;
    }

    public void setLgSEQUENCIERID(TSequencier lgSEQUENCIERID) {
        this.lgSEQUENCIERID = lgSEQUENCIERID;
    }

    public TRisque getLgRISQUEID() {
        return lgRISQUEID;
    }

    public void setLgRISQUEID(TRisque lgRISQUEID) {
        this.lgRISQUEID = lgRISQUEID;
    }

    public TRegimeCaisse getLgREGIMECAISSEID() {
        return lgREGIMECAISSEID;
    }

    public void setLgREGIMECAISSEID(TRegimeCaisse lgREGIMECAISSEID) {
        this.lgREGIMECAISSEID = lgREGIMECAISSEID;
    }

    public TTypeContrat getLgTYPECONTRATID() {
        return lgTYPECONTRATID;
    }

    public void setLgTYPECONTRATID(TTypeContrat lgTYPECONTRATID) {
        this.lgTYPECONTRATID = lgTYPECONTRATID;
    }

    public TTypeTiersPayant getLgTYPETIERSPAYANTID() {
        return lgTYPETIERSPAYANTID;
    }

    public void setLgTYPETIERSPAYANTID(TTypeTiersPayant lgTYPETIERSPAYANTID) {
        this.lgTYPETIERSPAYANTID = lgTYPETIERSPAYANTID;
    }

    public TVille getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(TVille lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public TModelFacture getLgMODELFACTUREID() {
        return lgMODELFACTUREID;
    }

    public void setLgMODELFACTUREID(TModelFacture lgMODELFACTUREID) {
        this.lgMODELFACTUREID = lgMODELFACTUREID;
    }

    @XmlTransient
    public Collection<TCompteClientTiersPayant> getTCompteClientTiersPayantCollection() {
        return tCompteClientTiersPayantCollection;
    }

    public void setTCompteClientTiersPayantCollection(
            Collection<TCompteClientTiersPayant> tCompteClientTiersPayantCollection) {
        this.tCompteClientTiersPayantCollection = tCompteClientTiersPayantCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTIERSPAYANTID != null ? lgTIERSPAYANTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTiersPayant)) {
            return false;
        }
        TTiersPayant other = (TTiersPayant) object;
        if ((this.lgTIERSPAYANTID == null && other.lgTIERSPAYANTID != null)
                || (this.lgTIERSPAYANTID != null && !this.lgTIERSPAYANTID.equals(other.lgTIERSPAYANTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTiersPayant[ lgTIERSPAYANTID=" + lgTIERSPAYANTID + " ]";
    }

    public void setDbCONSOMMATIONMENSUELLE(Integer dbCONSOMMATIONMENSUELLE) {
        this.dbCONSOMMATIONMENSUELLE = dbCONSOMMATIONMENSUELLE;
    }

    public Integer getDbCONSOMMATIONMENSUELLE() {
        return dbCONSOMMATIONMENSUELLE;
    }

    public Boolean getBIsAbsolute() {
        return bIsAbsolute;
    }

    public void setBIsAbsolute(Boolean bIsAbsolute) {
        this.bIsAbsolute = bIsAbsolute;
    }

    public Boolean getBCANBEUSE() {
        return bCANBEUSE;
    }

    public void setBCANBEUSE(Boolean bCANBEUSE) {
        this.bCANBEUSE = bCANBEUSE;
    }

    public TGroupeTierspayant getLgGROUPEID() {
        return lgGROUPEID;
    }

    public void setLgGROUPEID(TGroupeTierspayant lgGROUPEID) {
        this.lgGROUPEID = lgGROUPEID;
    }

    public Integer getIntNBREBONS() {
        return intNBREBONS;
    }

    public void setIntNBREBONS(Integer intNBREBONS) {
        this.intNBREBONS = intNBREBONS;
    }

    public Integer getIntMONTANTFAC() {
        return intMONTANTFAC;
    }

    public void setIntMONTANTFAC(Integer intMONTANTFAC) {
        this.intMONTANTFAC = intMONTANTFAC;
    }

    public Long getAccount() {
        return account;
    }

    public void setAccount(Long account) {
        this.account = account;
    }

    public Boolean getToBeExclude() {
        return toBeExclude;
    }

    public void setToBeExclude(Boolean toBeExclude) {
        this.toBeExclude = toBeExclude;
    }

    public Boolean getIsDepot() {
        return isDepot;
    }

    public void setIsDepot(Boolean isDepot) {
        this.isDepot = isDepot;
    }

    public Caution getCaution() {
        if (CollectionUtils.isNotEmpty(cautions)) {
            this.caution = cautions.get(0);
        }
        return caution;
    }

    public boolean hasCaution() {
        return Objects.nonNull(getCaution());
    }
}
