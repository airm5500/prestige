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
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Index;
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
@Table(name = "t_preenregistrement", indexes = { @Index(name = "indexpreechecked", columnList = "checked"), })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TPreenregistrement.findAll", query = "SELECT t FROM TPreenregistrement t"),
        @NamedQuery(name = "TPreenregistrement.findByLgPREENREGISTREMENTID", query = "SELECT t FROM TPreenregistrement t WHERE t.lgPREENREGISTREMENTID = :lgPREENREGISTREMENTID"),
        @NamedQuery(name = "TPreenregistrement.findByStrREF", query = "SELECT t FROM TPreenregistrement t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TPreenregistrement.findByStrREFTICKET", query = "SELECT t FROM TPreenregistrement t WHERE t.strREFTICKET = :strREFTICKET"),
        @NamedQuery(name = "TPreenregistrement.findByIntPRICE", query = "SELECT t FROM TPreenregistrement t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TPreenregistrement.findByIntPRICEREMISE", query = "SELECT t FROM TPreenregistrement t WHERE t.intPRICEREMISE = :intPRICEREMISE"),
        @NamedQuery(name = "TPreenregistrement.findByIntCUSTPART", query = "SELECT t FROM TPreenregistrement t WHERE t.intCUSTPART = :intCUSTPART"),
        @NamedQuery(name = "TPreenregistrement.findByStrSTATUT", query = "SELECT t FROM TPreenregistrement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TPreenregistrement.findByDtCREATED", query = "SELECT t FROM TPreenregistrement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TPreenregistrement.findByDtUPDATED", query = "SELECT t FROM TPreenregistrement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TPreenregistrement.findByStrMEDECIN", query = "SELECT t FROM TPreenregistrement t WHERE t.strMEDECIN = :strMEDECIN"),
        @NamedQuery(name = "TPreenregistrement.findByStrREFBON", query = "SELECT t FROM TPreenregistrement t WHERE t.strREFBON = :strREFBON"),
        @NamedQuery(name = "TPreenregistrement.findByStrORDONNANCE", query = "SELECT t FROM TPreenregistrement t WHERE t.strORDONNANCE = :strORDONNANCE"),
        @NamedQuery(name = "TPreenregistrement.findByLgPARENTID", query = "SELECT t FROM TPreenregistrement t WHERE t.lgPARENTID = :lgPARENTID"),
        @NamedQuery(name = "TPreenregistrement.findByDtCREATEDORDONNANCE", query = "SELECT t FROM TPreenregistrement t WHERE t.dtCREATEDORDONNANCE = :dtCREATEDORDONNANCE"),
        @NamedQuery(name = "TPreenregistrement.findByStrINFOSCLT", query = "SELECT t FROM TPreenregistrement t WHERE t.strINFOSCLT = :strINFOSCLT"),
        @NamedQuery(name = "TPreenregistrement.findByStrSTATUTVENTE", query = "SELECT t FROM TPreenregistrement t WHERE t.strSTATUTVENTE = :strSTATUTVENTE"),
        @NamedQuery(name = "TPreenregistrement.findByStrTYPEVENTE", query = "SELECT t FROM TPreenregistrement t WHERE t.strTYPEVENTE = :strTYPEVENTE"),
        @NamedQuery(name = "TPreenregistrement.findByLgREGLEMENTID", query = "SELECT t FROM TPreenregistrement t WHERE t.lgREGLEMENTID = :lgREGLEMENTID"),
        @NamedQuery(name = "TPreenregistrement.findByLgREMISEID", query = "SELECT t FROM TPreenregistrement t WHERE t.lgREMISEID = :lgREMISEID"),
        @NamedQuery(name = "TPreenregistrement.findByIntSENDTOSUGGESTION", query = "SELECT t FROM TPreenregistrement t WHERE t.intSENDTOSUGGESTION = :intSENDTOSUGGESTION"),
        @NamedQuery(name = "TPreenregistrement.findByBISCANCEL", query = "SELECT t FROM TPreenregistrement t WHERE t.bISCANCEL = :bISCANCEL"),
        @NamedQuery(name = "TPreenregistrement.findByStrFIRSTNAMECUSTOMER", query = "SELECT t FROM TPreenregistrement t WHERE t.strFIRSTNAMECUSTOMER = :strFIRSTNAMECUSTOMER"),
        @NamedQuery(name = "TPreenregistrement.findByStrLASTNAMECUSTOMER", query = "SELECT t FROM TPreenregistrement t WHERE t.strLASTNAMECUSTOMER = :strLASTNAMECUSTOMER"),
        @NamedQuery(name = "TPreenregistrement.findByStrNUMEROSECURITESOCIAL", query = "SELECT t FROM TPreenregistrement t WHERE t.strNUMEROSECURITESOCIAL = :strNUMEROSECURITESOCIAL"),
        @NamedQuery(name = "TPreenregistrement.findByStrPHONECUSTOME", query = "SELECT t FROM TPreenregistrement t WHERE t.strPHONECUSTOME = :strPHONECUSTOME"),
        @NamedQuery(name = "TPreenregistrement.findByLgPREENGISTREMENTANNULEID", query = "SELECT t FROM TPreenregistrement t WHERE t.lgPREENGISTREMENTANNULEID = :lgPREENGISTREMENTANNULEID"),
        @NamedQuery(name = "TPreenregistrement.findByDtANNULER", query = "SELECT t FROM TPreenregistrement t WHERE t.dtANNULER = :dtANNULER"),
        @NamedQuery(name = "TPreenregistrement.findByBISAVOIR", query = "SELECT t FROM TPreenregistrement t WHERE t.bISAVOIR = :bISAVOIR"),
        @NamedQuery(name = "TPreenregistrement.findByBWITHOUTBON", query = "SELECT t FROM TPreenregistrement t WHERE t.bWITHOUTBON = :bWITHOUTBON"),
        @NamedQuery(name = "TPreenregistrement.findByIntPRICEOTHER", query = "SELECT t FROM TPreenregistrement t WHERE t.intPRICEOTHER = :intPRICEOTHER") })

public class TPreenregistrement implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_PREENREGISTREMENT_ID", nullable = false, length = 40)
    private String lgPREENREGISTREMENTID;
    @Column(name = "str_REF", length = 30)
    private String strREF;
    @Column(name = "str_REF_TICKET", length = 10)
    private String strREFTICKET;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_REMISE")
    private Integer intPRICEREMISE;
    @Column(name = "int_CUST_PART")
    private Integer intCUSTPART;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_MEDECIN", length = 100)
    private String strMEDECIN;
    @Column(name = "str_REF_BON", length = 80)
    private String strREFBON;
    @Column(name = "str_ORDONNANCE", length = 40)
    private String strORDONNANCE;
    @Column(name = "lg_PARENT_ID", length = 40)
    private String lgPARENTID;
    @Column(name = "dt_CREATED_ORDONNANCE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATEDORDONNANCE;
    @Column(name = "str_INFOS_CLT", length = 200)
    private String strINFOSCLT;
    @Column(name = "str_STATUT_VENTE", length = 20)
    private String strSTATUTVENTE;
    @Column(name = "str_TYPE_VENTE", length = 40)
    private String strTYPEVENTE;
    @Column(name = "lg_REMISE_ID", length = 40)
    private String lgREMISEID;
    @Column(name = "int_SENDTOSUGGESTION")
    private Integer intSENDTOSUGGESTION;
    @Column(name = "b_IS_CANCEL")
    private Boolean bISCANCEL;
    @Column(name = "str_FIRST_NAME_CUSTOMER", length = 70)
    private String strFIRSTNAMECUSTOMER;
    @Column(name = "str_LAST_NAME_CUSTOMER", length = 70)
    private String strLASTNAMECUSTOMER;
    @Column(name = "str_NUMERO_SECURITE_SOCIAL", length = 50)
    private String strNUMEROSECURITESOCIAL;
    @Column(name = "str_PHONE_CUSTOME", length = 20)
    private String strPHONECUSTOME;
    @Column(name = "lg_PREENGISTREMENT_ANNULE_ID", length = 20)
    private String lgPREENGISTREMENTANNULEID;
    @Column(name = "dt_ANNULER")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtANNULER;
    @Basic(optional = false)
    @Column(name = "b_IS_AVOIR", nullable = false)
    private boolean bISAVOIR;
    @Basic(optional = false)
    @Column(name = "b_WITHOUT_BON", nullable = false)
    private boolean bWITHOUTBON;
    @Column(name = "int_PRICE_OTHER")
    private Integer intPRICEOTHER;
    @JoinColumn(name = "lg_USER_CAISSIER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERCAISSIERID;
    @JoinColumn(name = "lg_USER_VENDEUR_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERVENDEURID;
    @JoinColumn(name = "lg_TYPE_VENTE_ID", referencedColumnName = "lg_TYPE_VENTE_ID")
    @ManyToOne
    private TTypeVente lgTYPEVENTEID;
    @JoinColumn(name = "lg_NATURE_VENTE_ID", referencedColumnName = "lg_NATURE_VENTE_ID")
    @ManyToOne
    private TNatureVente lgNATUREVENTEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @OneToMany(mappedBy = "lgPREENREGISTREMENTID")
    private Collection<TPreenregistrementCompteClient> tPreenregistrementCompteClientCollection = new ArrayList<>();
    @OneToMany(mappedBy = "lgPREENREGISTREMENTID")
    private Collection<TPreenregistrementCompteClientTiersPayent> tPreenregistrementCompteClientTiersPayentCollection = new ArrayList<>();
    @OneToMany(mappedBy = "lgPREENREGISTREMENTID")
    private Collection<TPreenregistrementDetail> tPreenregistrementDetailCollection = new ArrayList<>();
    @Column(name = "int_ACCOUNT")
    private Integer intACCOUNT;
    @Column(name = "int_REMISE_PARA")
    private Integer intREMISEPARA;
    @Column(name = "PK_BRAND")
    private String pkBrand;
    @JoinColumn(name = "lg_REGLEMENT_ID", referencedColumnName = "lg_REGLEMENT_ID")
    @ManyToOne
    private TReglement lgREGLEMENTID;
    @JoinColumn(name = "remise", referencedColumnName = "lg_REMISE_ID")
    @ManyToOne
    private TRemise remise;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne
    private TClient client;
    @JoinColumn(name = "lg_AYANTS_DROITS_ID", referencedColumnName = "lg_AYANTS_DROITS_ID")
    @ManyToOne
    private TAyantDroit ayantDroit;
    @JoinColumn(name = "medecin_id", referencedColumnName = "id")
    @ManyToOne
    private Medecin medecin;
    @Column(name = "montantTva")
    private Integer montantTva = 0;
    @Column(name = "checked")
    private Boolean checked = true;
    @Column(name = "copy")
    private Boolean copy = false;
    @Column(name = "imported")
    private boolean imported = false;
    @Column(name = "margeug")
    private Integer margeug = 0;
    @Column(name = "montantttcug")
    private Integer montantttcug = 0;
    @Column(name = "montantnetug")
    private Integer montantnetug = 0;
    @Column(name = "montanttvaug")
    private Integer montantTvaUg = 0;
    @Column(name = "completion_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date completionDate = new Date();
    @OneToMany(mappedBy = "preenregistrement")
    private List<VenteReglement> venteReglements = new ArrayList<>();
    @ManyToOne
    private Caution caution;
    @Column(name = "has_price_option")
    private Boolean hasPriceOption = false;

    public boolean isImported() {
        return imported;
    }

    public void setImported(boolean imported) {
        this.imported = imported;
    }

    public Medecin getMedecin() {
        return medecin;
    }

    public void setMedecin(Medecin medecin) {
        this.medecin = medecin;
    }

    public Boolean getHasPriceOption() {
        return hasPriceOption;
    }

    public void setHasPriceOption(Boolean hasPriceOption) {
        this.hasPriceOption = hasPriceOption;
    }

    public Boolean getChecked() {
        return checked;
    }

    public Boolean getCopy() {
        return copy;
    }

    public void setCopy(Boolean copy) {
        this.copy = copy;
    }

    public void setChecked(Boolean checked) {
        this.checked = checked;
    }

    public Integer getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(Integer montantTva) {
        this.montantTva = montantTva;
    }

    public TAyantDroit getAyantDroit() {
        return ayantDroit;
    }

    public void setAyantDroit(TAyantDroit ayantDroit) {
        this.ayantDroit = ayantDroit;
    }

    public TClient getClient() {
        return client;
    }

    public void setClient(TClient client) {
        this.client = client;
    }

    public TRemise getRemise() {
        return remise;
    }

    public void setRemise(TRemise remise) {
        this.remise = remise;
    }

    public String getPkBrand() {
        return pkBrand;
    }

    public void setPkBrand(String pkBrand) {
        this.pkBrand = pkBrand;
    }

    public TPreenregistrement() {
    }

    public Integer getIntREMISEPARA() {
        return intREMISEPARA;
    }

    public Date getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(Date completionDate) {
        this.completionDate = completionDate;
    }

    public void setIntREMISEPARA(Integer intREMISEPARA) {
        this.intREMISEPARA = intREMISEPARA;
    }

    public TPreenregistrement(String lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    public TPreenregistrement(String lgPREENREGISTREMENTID, boolean bISAVOIR, boolean bWITHOUTBON) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
        this.bISAVOIR = bISAVOIR;
        this.bWITHOUTBON = bWITHOUTBON;
    }

    public String getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public void setLgPREENREGISTREMENTID(String lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public String getStrREFTICKET() {
        return strREFTICKET;
    }

    public void setStrREFTICKET(String strREFTICKET) {
        this.strREFTICKET = strREFTICKET;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICEREMISE() {
        return intPRICEREMISE;
    }

    public void setIntPRICEREMISE(Integer intPRICEREMISE) {
        this.intPRICEREMISE = intPRICEREMISE;
    }

    public Integer getIntCUSTPART() {
        return intCUSTPART;
    }

    public void setIntCUSTPART(Integer intCUSTPART) {
        this.intCUSTPART = intCUSTPART;
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

    public String getStrMEDECIN() {
        return strMEDECIN;
    }

    public void setStrMEDECIN(String strMEDECIN) {
        this.strMEDECIN = strMEDECIN;
    }

    public String getStrREFBON() {
        return strREFBON;
    }

    public void setStrREFBON(String strREFBON) {
        this.strREFBON = strREFBON;
    }

    public String getStrORDONNANCE() {
        return strORDONNANCE;
    }

    public void setStrORDONNANCE(String strORDONNANCE) {
        this.strORDONNANCE = strORDONNANCE;
    }

    public String getLgPARENTID() {
        return lgPARENTID;
    }

    public void setLgPARENTID(String lgPARENTID) {
        this.lgPARENTID = lgPARENTID;
    }

    public Date getDtCREATEDORDONNANCE() {
        return dtCREATEDORDONNANCE;
    }

    public void setDtCREATEDORDONNANCE(Date dtCREATEDORDONNANCE) {
        this.dtCREATEDORDONNANCE = dtCREATEDORDONNANCE;
    }

    public String getStrINFOSCLT() {
        return strINFOSCLT;
    }

    public void setStrINFOSCLT(String strINFOSCLT) {
        this.strINFOSCLT = strINFOSCLT;
    }

    public String getStrSTATUTVENTE() {
        return strSTATUTVENTE;
    }

    public void setStrSTATUTVENTE(String strSTATUTVENTE) {
        this.strSTATUTVENTE = strSTATUTVENTE;
    }

    public String getStrTYPEVENTE() {
        return strTYPEVENTE;
    }

    public void setStrTYPEVENTE(String strTYPEVENTE) {
        this.strTYPEVENTE = strTYPEVENTE;
    }

    public String getLgREMISEID() {
        return lgREMISEID;
    }

    public void setLgREMISEID(String lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    public Integer getIntSENDTOSUGGESTION() {
        return intSENDTOSUGGESTION;
    }

    public void setIntSENDTOSUGGESTION(Integer intSENDTOSUGGESTION) {
        this.intSENDTOSUGGESTION = intSENDTOSUGGESTION;
    }

    public Boolean getBISCANCEL() {
        return bISCANCEL;
    }

    public void setBISCANCEL(Boolean bISCANCEL) {
        this.bISCANCEL = bISCANCEL;
    }

    public String getStrFIRSTNAMECUSTOMER() {
        return strFIRSTNAMECUSTOMER;
    }

    public void setStrFIRSTNAMECUSTOMER(String strFIRSTNAMECUSTOMER) {
        this.strFIRSTNAMECUSTOMER = strFIRSTNAMECUSTOMER;
    }

    public String getStrLASTNAMECUSTOMER() {
        return strLASTNAMECUSTOMER;
    }

    public void setStrLASTNAMECUSTOMER(String strLASTNAMECUSTOMER) {
        this.strLASTNAMECUSTOMER = strLASTNAMECUSTOMER;
    }

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    public String getStrPHONECUSTOME() {
        return strPHONECUSTOME;
    }

    public void setStrPHONECUSTOME(String strPHONECUSTOME) {
        this.strPHONECUSTOME = strPHONECUSTOME;
    }

    public String getLgPREENGISTREMENTANNULEID() {
        return lgPREENGISTREMENTANNULEID;
    }

    public void setLgPREENGISTREMENTANNULEID(String lgPREENGISTREMENTANNULEID) {
        this.lgPREENGISTREMENTANNULEID = lgPREENGISTREMENTANNULEID;
    }

    public Date getDtANNULER() {
        return dtANNULER;
    }

    public void setDtANNULER(Date dtANNULER) {
        this.dtANNULER = dtANNULER;
    }

    public boolean getBISAVOIR() {
        return bISAVOIR;
    }

    public void setBISAVOIR(boolean bISAVOIR) {
        this.bISAVOIR = bISAVOIR;
    }

    public boolean getBWITHOUTBON() {
        return bWITHOUTBON;
    }

    public void setBWITHOUTBON(boolean bWITHOUTBON) {
        this.bWITHOUTBON = bWITHOUTBON;
    }

    public Integer getIntPRICEOTHER() {
        return intPRICEOTHER;
    }

    public void setIntPRICEOTHER(Integer intPRICEOTHER) {
        this.intPRICEOTHER = intPRICEOTHER;
    }

    public TUser getLgUSERCAISSIERID() {
        return lgUSERCAISSIERID;
    }

    public void setLgUSERCAISSIERID(TUser lgUSERCAISSIERID) {
        this.lgUSERCAISSIERID = lgUSERCAISSIERID;
    }

    public TUser getLgUSERVENDEURID() {
        return lgUSERVENDEURID;
    }

    public void setLgUSERVENDEURID(TUser lgUSERVENDEURID) {
        this.lgUSERVENDEURID = lgUSERVENDEURID;
    }

    public TTypeVente getLgTYPEVENTEID() {
        return lgTYPEVENTEID;
    }

    public void setLgTYPEVENTEID(TTypeVente lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
    }

    public TNatureVente getLgNATUREVENTEID() {
        return lgNATUREVENTEID;
    }

    public void setLgNATUREVENTEID(TNatureVente lgNATUREVENTEID) {
        this.lgNATUREVENTEID = lgNATUREVENTEID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @XmlTransient
    public Collection<TPreenregistrementCompteClient> getTPreenregistrementCompteClientCollection() {
        return tPreenregistrementCompteClientCollection;
    }

    public void setTPreenregistrementCompteClientCollection(
            Collection<TPreenregistrementCompteClient> tPreenregistrementCompteClientCollection) {
        this.tPreenregistrementCompteClientCollection = tPreenregistrementCompteClientCollection;
    }

    @XmlTransient
    public Collection<TPreenregistrementCompteClientTiersPayent> getTPreenregistrementCompteClientTiersPayentCollection() {
        return tPreenregistrementCompteClientTiersPayentCollection;
    }

    public void setTPreenregistrementCompteClientTiersPayentCollection(
            Collection<TPreenregistrementCompteClientTiersPayent> tPreenregistrementCompteClientTiersPayentCollection) {
        this.tPreenregistrementCompteClientTiersPayentCollection = tPreenregistrementCompteClientTiersPayentCollection;
    }

    @XmlTransient
    public Collection<TPreenregistrementDetail> getTPreenregistrementDetailCollection() {
        return tPreenregistrementDetailCollection;
    }

    public void setTPreenregistrementDetailCollection(
            Collection<TPreenregistrementDetail> tPreenregistrementDetailCollection) {
        this.tPreenregistrementDetailCollection = tPreenregistrementDetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgPREENREGISTREMENTID != null ? lgPREENREGISTREMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPreenregistrement)) {
            return false;
        }
        TPreenregistrement other = (TPreenregistrement) object;
        if ((this.lgPREENREGISTREMENTID == null && other.lgPREENREGISTREMENTID != null)
                || (this.lgPREENREGISTREMENTID != null
                        && !this.lgPREENREGISTREMENTID.equals(other.lgPREENREGISTREMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "TPreenregistrement{" + "lgPREENREGISTREMENTID=" + lgPREENREGISTREMENTID + ", strREF=" + strREF
                + ", strREFTICKET=" + strREFTICKET + '}';
    }

    public TReglement getLgREGLEMENTID() {
        return lgREGLEMENTID;
    }

    public void setLgREGLEMENTID(TReglement lgREGLEMENTID) {
        this.lgREGLEMENTID = lgREGLEMENTID;
    }

    public Integer getIntACCOUNT() {
        return intACCOUNT;
    }

    public void setIntACCOUNT(Integer intACCOUNT) {
        this.intACCOUNT = intACCOUNT;
    }

    public Integer getMargeug() {
        return margeug;
    }

    public void setMargeug(Integer margeug) {
        this.margeug = margeug;
    }

    public Integer getMontantttcug() {
        return montantttcug;
    }

    public void setMontantttcug(Integer montantttcug) {
        this.montantttcug = montantttcug;
    }

    public Integer getMontantnetug() {
        return montantnetug;
    }

    public void setMontantnetug(Integer montantnetug) {
        this.montantnetug = montantnetug;
    }

    public Integer getMontantTvaUg() {
        return montantTvaUg;
    }

    public void setMontantTvaUg(Integer montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
    }

    public List<VenteReglement> getVenteReglements() {
        return venteReglements;
    }

    public void setVenteReglements(List<VenteReglement> venteReglements) {
        this.venteReglements = venteReglements;
    }

    public Caution getCaution() {
        return caution;
    }

    public void setCaution(Caution caution) {
        this.caution = caution;
    }

}
