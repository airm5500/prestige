/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import java.util.Optional;
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
import javax.persistence.Version;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_famille")

@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFamille.findAll", query = "SELECT t FROM TFamille t"),
        @NamedQuery(name = "TFamille.findByLgFAMILLEID", query = "SELECT t FROM TFamille t WHERE t.lgFAMILLEID = :lgFAMILLEID"),
        @NamedQuery(name = "TFamille.findByLgFAMILLEPARENTID", query = "SELECT t FROM TFamille t WHERE t.lgFAMILLEPARENTID = :lgFAMILLEPARENTID"),
        @NamedQuery(name = "TFamille.findByStrNAME", query = "SELECT t FROM TFamille t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TFamille.findByStrDESCRIPTION", query = "SELECT t FROM TFamille t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TFamille.findByIntCIP", query = "SELECT t FROM TFamille t WHERE t.intCIP = :intCIP"),
        @NamedQuery(name = "TFamille.findByStrSTATUT", query = "SELECT t FROM TFamille t WHERE t.strSTATUT = :strSTATUT")

})

public class TFamille implements Serializable {

    private static final long serialVersionUID = 1L;
    @Column(name = "int_ORERSTATUS")
    private Short intORERSTATUS = 0;
    @Column(name = "bool_ACCOUNT")
    private Boolean boolACCOUNT = Boolean.TRUE;
    @Column(name = "b_CODEINDICATEUR")
    private Short bCODEINDICATEUR = 0;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_ID", nullable = false, length = 40)
    private String lgFAMILLEID;
    @Column(name = "lg_FAMILLE_PARENT_ID", length = 40)
    private String lgFAMILLEPARENTID;
    @Column(name = "str_NAME", length = 60)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 60)
    private String strDESCRIPTION;
    @Column(name = "str_CODE_REMISE", length = 2)
    private String strCODEREMISE;
    @Column(name = "str_CODE_TAUX_REMBOURSEMENT", length = 20)
    private String strCODETAUXREMBOURSEMENT;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_TIPS")
    private Integer intPRICETIPS;
    @Column(name = "int_TAUX_MARQUE")
    private Integer intTAUXMARQUE;
    @Column(name = "int_CIP", length = 20)
    private String intCIP;
    @Column(name = "int_CIP2", length = 20)
    private String intCIP2;
    @Column(name = "int_CIP3", length = 20)
    private String intCIP3;
    @Column(name = "int_CIP4", length = 20)
    private String intCIP4;
    @Column(name = "int_EAN13", length = 50)
    private String intEAN13;
    @Column(name = "int_S")
    private Integer intS;
    @Column(name = "int_T", length = 20)
    private String intT;
    @Column(name = "int_PAF")
    private Integer intPAF;
    @Column(name = "int_PAT")
    private Integer intPAT;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED = new Date();
    @Column(name = "int_SEUIL_MIN")
    private Integer intSEUILMIN;
    @Column(name = "int_STOCK_REAPROVISONEMENT")
    private Integer intSTOCKREAPROVISONEMENT;
    @Column(name = "int_SEUIL_MAX")
    private Integer intSEUILMAX;
    @Column(name = "int_DAY_HISTORY")
    private Integer intDAYHISTORY;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_LAST_PRIX_ACHAT", precision = 15, scale = 2)
    private Double dblLASTPRIXACHAT;
    @Column(name = "dbl_MARGE", precision = 15, scale = 3)
    private Double dblMARGE;
    @Column(name = "dbl_MARGE_BRUTE", precision = 15, scale = 3)
    private Double dblMARGEBRUTE;
    @Column(name = "dbl_TAUX_MARGE", precision = 15, scale = 3)
    private Double dblTAUXMARGE;
    @Column(name = "dbl_PRIX_MOYEN_PONDERE", precision = 15, scale = 3)
    private Double dblPRIXMOYENPONDERE;
    @Column(name = "str_CODE_TABLEAU", length = 20)
    private String strCODETABLEAU;
    @Column(name = "lg_ETAT_ARTICLE_ID", length = 20)
    private String lgETATARTICLEID;
    @Column(name = "bool_RESERVE")
    private Boolean boolRESERVE;
    @Column(name = "bool_ETIQUETTE")
    private Short boolETIQUETTE;
    @Column(name = "bool_DECONDITIONNE")
    private Short boolDECONDITIONNE;
    @Column(name = "bool_DECONDITIONNE_EXIST")
    private Short boolDECONDITIONNEEXIST;
    @Column(name = "int_UNITE_ACHAT")
    private Integer intUNITEACHAT;
    @Column(name = "dbl_CONTENANCE_1000", precision = 15, scale = 3)
    private Double dblCONTENANCE1000;
    @Column(name = "dt_PEREMPTION")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPEREMPTION;
    @Column(name = "int_COMPTEUR_PEREMPTION")
    private Integer intCOMPTEURPEREMPTION;
    @Column(name = "dt_DATE_LAST_ENTREE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATELASTENTREE;
    @Column(name = "dt_DATE_LAST_SORTIE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATELASTSORTIE;
    @Column(name = "int_SEUIL_RESERVE")
    private Integer intSEUILRESERVE;
    @Column(name = "int_NOMBRE_VENTES")
    private Integer intNOMBREVENTES;
    @Column(name = "int_QTE_MANQUANTE")
    private Integer intQTEMANQUANTE;
    @Column(name = "int_QTE_RESERVEE")
    private Integer intQTERESERVEE;
    @Column(name = "int_NUMBERDETAIL")
    private Integer intNUMBERDETAIL;
    @Column(name = "int_SEUILDETAIL")
    private Integer intSEUILDETAIL;
    @Column(name = "int_UNITE_VENTE")
    private Integer intUNITEVENTE;
    @Column(name = "dbl_COEF_SECURITE", precision = 15, scale = 3)
    private Double dblCOEFSECURITE;
    @Column(name = "int_QTE_REAPPROVISIONNEMENT")
    private Integer intQTEREAPPROVISIONNEMENT;
    @Column(name = "int_DATE_BUTOIR")
    private Integer intDATEBUTOIR;
    @Column(name = "int_DELAI_REAPPRO")
    private Integer intDELAIREAPPRO;
    @Column(name = "int_CONSO_MOIS")
    private Integer intCONSOMOIS;
    @Column(name = "int_NBRE_UNITE_LAST_VENTE")
    private Integer intNBREUNITELASTVENTE;
    @Column(name = "int_NBRE_SORTIE")
    private Integer intNBRESORTIE;
    @Column(name = "int_QTE_SORTIE")
    private Integer intQTESORTIE;
    @Column(name = "int_MOY_VENTE")
    private Integer intMOYVENTE;
    @Column(name = "dt_LAST_INVENTAIRE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtLASTINVENTAIRE;
    @Column(name = "dt_LAST_MOUVEMENT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtLASTMOUVEMENT;
    @Column(name = "int_IDS")
    private Integer intIDS;
    @Column(name = "bl_PROMOTED")
    private Boolean blPROMOTED;
    @Column(name = "bool_CHECKEXPIRATIONDATE")
    private Boolean boolCHECKEXPIRATIONDATE;
    @Column(name = "dt_LAST_UPDATE_SEUILREAPPRO")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtLASTUPDATESEUILREAPPRO;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TSnapShopDalyStat> tSnapShopDalyStatCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TRetrocessionDetail> tRetrocessionDetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TEtiquette> tEtiquetteCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TAjustementDetail> tAjustementDetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TInventaireFamille> tInventaireFamilleCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TFamilleZonegeo> tFamilleZonegeoCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TSnapShopDalySortieFamille> tSnapShopDalySortieFamilleCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TPromotionProduct> tPromotionProductCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TDeconditionnement> tDeconditionnementCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TTypeStockFamille> tTypeStockFamilleCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TFamilleStock> tFamilleStockCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TWarehouse> tWarehouseCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TFamilleStockretrocession> tFamilleStockretrocessionCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TSuggestionOrderDetails> tSuggestionOrderDetailsCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TLot> tLotCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TRetourFournisseurDetail> tRetourFournisseurDetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TMouvementSnapshot> tMouvementSnapshotCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TWarehousedetail> tWarehousedetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TSnapshotFamillesell> tSnapshotFamillesellCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TSnapShopRuptureStock> tSnapShopRuptureStockCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TOrderDetail> tOrderDetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TFamilleDci> tFamilleDciCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TRetourdepotdetail> tRetourdepotdetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TEvaluationoffreprix> tEvaluationoffreprixCollection;
    @JoinColumn(name = "lg_INDICATEUR_REAPPROVISIONNEMENT_ID", referencedColumnName = "lg_INDICATEUR_REAPPROVISIONNEMENT_ID")
    @ManyToOne
    private TIndicateurReapprovisionnement lgINDICATEURREAPPROVISIONNEMENTID;
    @JoinColumn(name = "lg_REMISE_ID", referencedColumnName = "lg_REMISE_ID")
    @ManyToOne
    private TRemise lgREMISEID;
    @JoinColumn(name = "lg_TYPEETIQUETTE_ID", referencedColumnName = "lg_TYPEETIQUETTE_ID")
    @ManyToOne
    private TTypeetiquette lgTYPEETIQUETTEID;
    @JoinColumn(name = "lg_FABRIQUANT_ID", referencedColumnName = "lg_FABRIQUANT_ID")
    @ManyToOne
    private TFabriquant lgFABRIQUANTID;
    @JoinColumn(name = "lg_FORME_ID", referencedColumnName = "lg_FORME_ARTICLE_ID")
    @ManyToOne
    private TFormeArticle lgFORMEID;
    @JoinColumn(name = "lg_ZONE_GEO_ID", referencedColumnName = "lg_ZONE_GEO_ID")
    @ManyToOne
    private TZoneGeographique lgZONEGEOID;
    @JoinColumn(name = "lg_CODE_GESTION_ID", referencedColumnName = "lg_CODE_GESTION_ID")
    @ManyToOne
    private TCodeGestion lgCODEGESTIONID;
    @JoinColumn(name = "lg_FAMILLEARTICLE_ID", referencedColumnName = "lg_FAMILLEARTICLE_ID")
    @ManyToOne
    private TFamillearticle lgFAMILLEARTICLEID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @JoinColumn(name = "lg_CODE_ACTE_ID", referencedColumnName = "lg_CODE_ACTE_ID")
    @ManyToOne
    private TCodeActe lgCODEACTEID;
    @JoinColumn(name = "lg_CODE_TVA_ID", referencedColumnName = "lg_CODE_TVA_ID")
    @ManyToOne
    private TCodeTva lgCODETVAID;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TMouvementprice> tMouvementpriceCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TFamilleGrossiste> tFamilleGrossisteCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TPreenregistrementDetail> tPreenregistrementDetailCollection;
    @OneToMany(mappedBy = "lgFAMILLEID")
    private Collection<TMouvement> tMouvementCollection;
    @Version
    private int version;
    @OneToMany(mappedBy = "famille")
    private Collection<HMvtProduit> hMvtProduits;
    @ManyToOne
    private Laboratoire laboratoire;
    @ManyToOne
    private GammeProduit gamme;
    @Column(name = "is_scheduled")
    private boolean scheduled = false;
    @Column(name = "cmu_price")
    private Integer cmuPrice;

    public int getVersion() {
        return version;
    }

    public Integer getCmuPrice() {
        return cmuPrice;
    }

    public void setCmuPrice(Integer cmuPrice) {
        this.cmuPrice = cmuPrice;
    }

    public GammeProduit getGamme() {
        return gamme;
    }

    public boolean isScheduled() {
        return scheduled;
    }

    public void setScheduled(boolean scheduled) {
        this.scheduled = scheduled;
    }

    public void setGamme(GammeProduit gamme) {
        this.gamme = gamme;
    }

    public Laboratoire getLaboratoire() {
        return laboratoire;
    }

    public void setLaboratoire(Laboratoire laboratoire) {
        this.laboratoire = laboratoire;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public TFamille() {
    }

    public TFamille(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TFamille(String lgFAMILLEID, String lgFAMILLEPARENTID) {
        this.lgFAMILLEID = lgFAMILLEID;
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getLgFAMILLEPARENTID() {
        return lgFAMILLEPARENTID;
    }

    public void setLgFAMILLEPARENTID(String lgFAMILLEPARENTID) {
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrCODEREMISE() {
        return strCODEREMISE;
    }

    public void setStrCODEREMISE(String strCODEREMISE) {
        this.strCODEREMISE = strCODEREMISE;
    }

    public String getStrCODETAUXREMBOURSEMENT() {
        return strCODETAUXREMBOURSEMENT;
    }

    public void setStrCODETAUXREMBOURSEMENT(String strCODETAUXREMBOURSEMENT) {
        this.strCODETAUXREMBOURSEMENT = strCODETAUXREMBOURSEMENT;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICETIPS() {
        return intPRICETIPS;
    }

    public void setIntPRICETIPS(Integer intPRICETIPS) {
        this.intPRICETIPS = intPRICETIPS;
    }

    public Integer getIntTAUXMARQUintCIPE() {
        return intTAUXMARQUE;
    }

    public void setIntTAUXMARQUE(Integer intTAUXMARQUE) {
        this.intTAUXMARQUE = intTAUXMARQUE;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getIntCIP2() {
        return intCIP2;
    }

    public void setIntCIP2(String intCIP2) {
        this.intCIP2 = intCIP2;
    }

    public String getIntCIP3() {
        return intCIP3;
    }

    public void setIntCIP3(String intCIP3) {
        this.intCIP3 = intCIP3;
    }

    public String getIntCIP4() {
        return intCIP4;
    }

    public void setIntCIP4(String intCIP4) {
        this.intCIP4 = intCIP4;
    }

    public String getIntEAN13() {
        return intEAN13;
    }

    public void setIntEAN13(String intEAN13) {
        this.intEAN13 = intEAN13;
    }

    public Integer getIntS() {
        return intS;
    }

    public void setIntS(Integer intS) {
        this.intS = intS;
    }

    public String getIntT() {
        return intT;
    }

    public void setIntT(String intT) {
        this.intT = intT;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
    }

    public Integer getIntPAT() {
        return intPAT;
    }

    public void setIntPAT(Integer intPAT) {
        this.intPAT = intPAT;
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

    public Integer getIntSEUILMIN() {
        return intSEUILMIN;
    }

    public void setIntSEUILMIN(Integer intSEUILMIN) {
        this.intSEUILMIN = intSEUILMIN;
    }

    public Integer getIntSTOCKREAPROVISONEMENT() {
        return intSTOCKREAPROVISONEMENT;
    }

    public void setIntSTOCKREAPROVISONEMENT(Integer intSTOCKREAPROVISONEMENT) {
        this.intSTOCKREAPROVISONEMENT = intSTOCKREAPROVISONEMENT;
    }

    public Integer getIntSEUILMAX() {
        return intSEUILMAX;
    }

    public void setIntSEUILMAX(Integer intSEUILMAX) {
        this.intSEUILMAX = intSEUILMAX;
    }

    public Integer getIntDAYHISTORY() {
        return intDAYHISTORY;
    }

    public void setIntDAYHISTORY(Integer intDAYHISTORY) {
        this.intDAYHISTORY = intDAYHISTORY;
    }

    public Double getDblLASTPRIXACHAT() {
        return dblLASTPRIXACHAT;
    }

    public void setDblLASTPRIXACHAT(Double dblLASTPRIXACHAT) {
        this.dblLASTPRIXACHAT = dblLASTPRIXACHAT;
    }

    public Double getDblMARGE() {
        return dblMARGE;
    }

    public void setDblMARGE(Double dblMARGE) {
        this.dblMARGE = dblMARGE;
    }

    public Double getDblMARGEBRUTE() {
        return dblMARGEBRUTE;
    }

    public void setDblMARGEBRUTE(Double dblMARGEBRUTE) {
        this.dblMARGEBRUTE = dblMARGEBRUTE;
    }

    public Double getDblTAUXMARGE() {
        return dblTAUXMARGE;
    }

    public void setDblTAUXMARGE(Double dblTAUXMARGE) {
        this.dblTAUXMARGE = dblTAUXMARGE;
    }

    public Double getDblPRIXMOYENPONDERE() {
        return dblPRIXMOYENPONDERE;
    }

    public void setDblPRIXMOYENPONDERE(Double dblPRIXMOYENPONDERE) {
        this.dblPRIXMOYENPONDERE = dblPRIXMOYENPONDERE;
    }

    public String getStrCODETABLEAU() {
        return strCODETABLEAU;
    }

    public void setStrCODETABLEAU(String strCODETABLEAU) {
        this.strCODETABLEAU = strCODETABLEAU;
    }

    public String getLgETATARTICLEID() {
        return lgETATARTICLEID;
    }

    public void setLgETATARTICLEID(String lgETATARTICLEID) {
        this.lgETATARTICLEID = lgETATARTICLEID;
    }

    public Boolean getBoolRESERVE() {
        return boolRESERVE;
    }

    public void setBoolRESERVE(Boolean boolRESERVE) {
        this.boolRESERVE = boolRESERVE;
    }

    public Short getBoolETIQUETTE() {
        return boolETIQUETTE;
    }

    public void setBoolETIQUETTE(Short boolETIQUETTE) {
        this.boolETIQUETTE = boolETIQUETTE;
    }

    public Short getBoolDECONDITIONNE() {
        return boolDECONDITIONNE;
    }

    public void setBoolDECONDITIONNE(Short boolDECONDITIONNE) {
        this.boolDECONDITIONNE = boolDECONDITIONNE;
    }

    public Short getBoolDECONDITIONNEEXIST() {
        return boolDECONDITIONNEEXIST;
    }

    public void setBoolDECONDITIONNEEXIST(Short boolDECONDITIONNEEXIST) {
        this.boolDECONDITIONNEEXIST = boolDECONDITIONNEEXIST;
    }

    public Integer getIntUNITEACHAT() {
        return intUNITEACHAT;
    }

    public void setIntUNITEACHAT(Integer intUNITEACHAT) {
        this.intUNITEACHAT = intUNITEACHAT;
    }

    public Double getDblCONTENANCE1000() {
        return dblCONTENANCE1000;
    }

    public void setDblCONTENANCE1000(Double dblCONTENANCE1000) {
        this.dblCONTENANCE1000 = dblCONTENANCE1000;
    }

    public Date getDtPEREMPTION() {
        return dtPEREMPTION;
    }

    public void setDtPEREMPTION(Date dtPEREMPTION) {
        this.dtPEREMPTION = dtPEREMPTION;
    }

    public Integer getIntCOMPTEURPEREMPTION() {
        return intCOMPTEURPEREMPTION;
    }

    public void setIntCOMPTEURPEREMPTION(Integer intCOMPTEURPEREMPTION) {
        this.intCOMPTEURPEREMPTION = intCOMPTEURPEREMPTION;
    }

    public Date getDtDATELASTENTREE() {
        return dtDATELASTENTREE;
    }

    public void setDtDATELASTENTREE(Date dtDATELASTENTREE) {
        this.dtDATELASTENTREE = dtDATELASTENTREE;
    }

    public Date getDtDATELASTSORTIE() {
        return dtDATELASTSORTIE;
    }

    public void setDtDATELASTSORTIE(Date dtDATELASTSORTIE) {
        this.dtDATELASTSORTIE = dtDATELASTSORTIE;
    }

    public Integer getIntSEUILRESERVE() {
        return intSEUILRESERVE;
    }

    public void setIntSEUILRESERVE(Integer intSEUILRESERVE) {
        this.intSEUILRESERVE = intSEUILRESERVE;
    }

    public Integer getIntNOMBREVENTES() {
        return intNOMBREVENTES;
    }

    public void setIntNOMBREVENTES(Integer intNOMBREVENTES) {
        this.intNOMBREVENTES = intNOMBREVENTES;
    }

    public Integer getIntQTEMANQUANTE() {
        return intQTEMANQUANTE;
    }

    public void setIntQTEMANQUANTE(Integer intQTEMANQUANTE) {
        this.intQTEMANQUANTE = intQTEMANQUANTE;
    }

    public Integer getIntQTERESERVEE() {
        return intQTERESERVEE;
    }

    public void setIntQTERESERVEE(Integer intQTERESERVEE) {
        this.intQTERESERVEE = intQTERESERVEE;
    }

    public Integer getIntNUMBERDETAIL() {
        return intNUMBERDETAIL;
    }

    public void setIntNUMBERDETAIL(Integer intNUMBERDETAIL) {
        this.intNUMBERDETAIL = intNUMBERDETAIL;
    }

    public Integer getIntSEUILDETAIL() {
        return intSEUILDETAIL;
    }

    public Integer getIntTAUXMARQUE() {
        return intTAUXMARQUE;
    }

    public void setIntSEUILDETAIL(Integer intSEUILDETAIL) {
        this.intSEUILDETAIL = intSEUILDETAIL;
    }

    public Integer getIntUNITEVENTE() {
        return intUNITEVENTE;
    }

    public void setIntUNITEVENTE(Integer intUNITEVENTE) {
        this.intUNITEVENTE = intUNITEVENTE;
    }

    public Double getDblCOEFSECURITE() {
        return dblCOEFSECURITE;
    }

    public void setDblCOEFSECURITE(Double dblCOEFSECURITE) {
        this.dblCOEFSECURITE = dblCOEFSECURITE;
    }

    public Integer getIntQTEREAPPROVISIONNEMENT() {
        return intQTEREAPPROVISIONNEMENT;
    }

    public void setIntQTEREAPPROVISIONNEMENT(Integer intQTEREAPPROVISIONNEMENT) {
        this.intQTEREAPPROVISIONNEMENT = intQTEREAPPROVISIONNEMENT;
    }

    public Integer getIntDATEBUTOIR() {
        return intDATEBUTOIR;
    }

    public void setIntDATEBUTOIR(Integer intDATEBUTOIR) {
        this.intDATEBUTOIR = intDATEBUTOIR;
    }

    public Integer getIntDELAIREAPPRO() {
        return intDELAIREAPPRO;
    }

    public void setIntDELAIREAPPRO(Integer intDELAIREAPPRO) {
        this.intDELAIREAPPRO = intDELAIREAPPRO;
    }

    public Integer getIntCONSOMOIS() {
        return intCONSOMOIS;
    }

    public void setIntCONSOMOIS(Integer intCONSOMOIS) {
        this.intCONSOMOIS = intCONSOMOIS;
    }

    public Integer getIntNBREUNITELASTVENTE() {
        return intNBREUNITELASTVENTE;
    }

    public void setIntNBREUNITELASTVENTE(Integer intNBREUNITELASTVENTE) {
        this.intNBREUNITELASTVENTE = intNBREUNITELASTVENTE;
    }

    public Integer getIntNBRESORTIE() {
        return intNBRESORTIE;
    }

    public void setIntNBRESORTIE(Integer intNBRESORTIE) {
        this.intNBRESORTIE = intNBRESORTIE;
    }

    public Integer getIntQTESORTIE() {
        return intQTESORTIE;
    }

    public void setIntQTESORTIE(Integer intQTESORTIE) {
        this.intQTESORTIE = intQTESORTIE;
    }

    public Integer getIntMOYVENTE() {
        return intMOYVENTE;
    }

    public void setIntMOYVENTE(Integer intMOYVENTE) {
        this.intMOYVENTE = intMOYVENTE;
    }

    public Date getDtLASTINVENTAIRE() {
        return dtLASTINVENTAIRE;
    }

    public void setDtLASTINVENTAIRE(Date dtLASTINVENTAIRE) {
        this.dtLASTINVENTAIRE = dtLASTINVENTAIRE;
    }

    public Date getDtLASTMOUVEMENT() {
        return dtLASTMOUVEMENT;
    }

    public void setDtLASTMOUVEMENT(Date dtLASTMOUVEMENT) {
        this.dtLASTMOUVEMENT = dtLASTMOUVEMENT;
    }

    public Integer getIntIDS() {
        return intIDS;
    }

    public void setIntIDS(Integer intIDS) {
        this.intIDS = intIDS;
    }

    public Boolean getBlPROMOTED() {
        return blPROMOTED;
    }

    public void setBlPROMOTED(Boolean blPROMOTED) {
        this.blPROMOTED = blPROMOTED;
    }

    public Boolean getBoolCHECKEXPIRATIONDATE() {
        return boolCHECKEXPIRATIONDATE;
    }

    public void setBoolCHECKEXPIRATIONDATE(Boolean boolCHECKEXPIRATIONDATE) {
        this.boolCHECKEXPIRATIONDATE = boolCHECKEXPIRATIONDATE;
    }

    public Date getDtLASTUPDATESEUILREAPPRO() {
        return dtLASTUPDATESEUILREAPPRO;
    }

    public void setDtLASTUPDATESEUILREAPPRO(Date dtLASTUPDATESEUILREAPPRO) {
        this.dtLASTUPDATESEUILREAPPRO = dtLASTUPDATESEUILREAPPRO;
    }

    @XmlTransient
    public Collection<TSnapShopDalyStat> getTSnapShopDalyStatCollection() {
        return tSnapShopDalyStatCollection;
    }

    public void setTSnapShopDalyStatCollection(Collection<TSnapShopDalyStat> tSnapShopDalyStatCollection) {
        this.tSnapShopDalyStatCollection = tSnapShopDalyStatCollection;
    }

    @XmlTransient
    public Collection<TRetrocessionDetail> getTRetrocessionDetailCollection() {
        return tRetrocessionDetailCollection;
    }

    public void setTRetrocessionDetailCollection(Collection<TRetrocessionDetail> tRetrocessionDetailCollection) {
        this.tRetrocessionDetailCollection = tRetrocessionDetailCollection;
    }

    @XmlTransient
    public Collection<TEtiquette> getTEtiquetteCollection() {
        return tEtiquetteCollection;
    }

    public void setTEtiquetteCollection(Collection<TEtiquette> tEtiquetteCollection) {
        this.tEtiquetteCollection = tEtiquetteCollection;
    }

    @XmlTransient
    public Collection<TAjustementDetail> getTAjustementDetailCollection() {
        return tAjustementDetailCollection;
    }

    public void setTAjustementDetailCollection(Collection<TAjustementDetail> tAjustementDetailCollection) {
        this.tAjustementDetailCollection = tAjustementDetailCollection;
    }

    @XmlTransient
    public Collection<TInventaireFamille> getTInventaireFamilleCollection() {
        return tInventaireFamilleCollection;
    }

    public void setTInventaireFamilleCollection(Collection<TInventaireFamille> tInventaireFamilleCollection) {
        this.tInventaireFamilleCollection = tInventaireFamilleCollection;
    }

    @XmlTransient
    public Collection<TFamilleZonegeo> getTFamilleZonegeoCollection() {
        return tFamilleZonegeoCollection;
    }

    public void setTFamilleZonegeoCollection(Collection<TFamilleZonegeo> tFamilleZonegeoCollection) {
        this.tFamilleZonegeoCollection = tFamilleZonegeoCollection;
    }

    @XmlTransient
    public Collection<TSnapShopDalySortieFamille> getTSnapShopDalySortieFamilleCollection() {
        return tSnapShopDalySortieFamilleCollection;
    }

    public void setTSnapShopDalySortieFamilleCollection(
            Collection<TSnapShopDalySortieFamille> tSnapShopDalySortieFamilleCollection) {
        this.tSnapShopDalySortieFamilleCollection = tSnapShopDalySortieFamilleCollection;
    }

    @XmlTransient
    public Collection<TPromotionProduct> getTPromotionProductCollection() {
        return tPromotionProductCollection;
    }

    public void setTPromotionProductCollection(Collection<TPromotionProduct> tPromotionProductCollection) {
        this.tPromotionProductCollection = tPromotionProductCollection;
    }

    @XmlTransient
    public Collection<TDeconditionnement> getTDeconditionnementCollection() {
        return tDeconditionnementCollection;
    }

    public void setTDeconditionnementCollection(Collection<TDeconditionnement> tDeconditionnementCollection) {
        this.tDeconditionnementCollection = tDeconditionnementCollection;
    }

    @XmlTransient
    public Collection<TTypeStockFamille> getTTypeStockFamilleCollection() {
        return tTypeStockFamilleCollection;
    }

    public void setTTypeStockFamilleCollection(Collection<TTypeStockFamille> tTypeStockFamilleCollection) {
        this.tTypeStockFamilleCollection = tTypeStockFamilleCollection;
    }

    @XmlTransient
    public Collection<TBonLivraisonDetail> getTBonLivraisonDetailCollection() {
        return tBonLivraisonDetailCollection;
    }

    public void setTBonLivraisonDetailCollection(Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection) {
        this.tBonLivraisonDetailCollection = tBonLivraisonDetailCollection;
    }

    @XmlTransient
    public Collection<TFamilleStock> getTFamilleStockCollection() {
        return tFamilleStockCollection;
    }

    public void setTFamilleStockCollection(Collection<TFamilleStock> tFamilleStockCollection) {
        this.tFamilleStockCollection = tFamilleStockCollection;
    }

    @XmlTransient
    public Collection<TWarehouse> getTWarehouseCollection() {
        return tWarehouseCollection;
    }

    public void setTWarehouseCollection(Collection<TWarehouse> tWarehouseCollection) {
        this.tWarehouseCollection = tWarehouseCollection;
    }

    @XmlTransient
    public Collection<TFamilleStockretrocession> getTFamilleStockretrocessionCollection() {
        return tFamilleStockretrocessionCollection;
    }

    public void setTFamilleStockretrocessionCollection(
            Collection<TFamilleStockretrocession> tFamilleStockretrocessionCollection) {
        this.tFamilleStockretrocessionCollection = tFamilleStockretrocessionCollection;
    }

    @XmlTransient
    public Collection<TSuggestionOrderDetails> getTSuggestionOrderDetailsCollection() {
        return tSuggestionOrderDetailsCollection;
    }

    public void setTSuggestionOrderDetailsCollection(
            Collection<TSuggestionOrderDetails> tSuggestionOrderDetailsCollection) {
        this.tSuggestionOrderDetailsCollection = tSuggestionOrderDetailsCollection;
    }

    @XmlTransient
    public Collection<TLot> getTLotCollection() {
        return tLotCollection;
    }

    public void setTLotCollection(Collection<TLot> tLotCollection) {
        this.tLotCollection = tLotCollection;
    }

    @XmlTransient
    public Collection<TRetourFournisseurDetail> getTRetourFournisseurDetailCollection() {
        return tRetourFournisseurDetailCollection;
    }

    public void setTRetourFournisseurDetailCollection(
            Collection<TRetourFournisseurDetail> tRetourFournisseurDetailCollection) {
        this.tRetourFournisseurDetailCollection = tRetourFournisseurDetailCollection;
    }

    @XmlTransient
    public Collection<TMouvementSnapshot> getTMouvementSnapshotCollection() {
        return tMouvementSnapshotCollection;
    }

    public void setTMouvementSnapshotCollection(Collection<TMouvementSnapshot> tMouvementSnapshotCollection) {
        this.tMouvementSnapshotCollection = tMouvementSnapshotCollection;
    }

    @XmlTransient
    public Collection<TWarehousedetail> getTWarehousedetailCollection() {
        return tWarehousedetailCollection;
    }

    public void setTWarehousedetailCollection(Collection<TWarehousedetail> tWarehousedetailCollection) {
        this.tWarehousedetailCollection = tWarehousedetailCollection;
    }

    @XmlTransient
    public Collection<TSnapshotFamillesell> getTSnapshotFamillesellCollection() {
        return tSnapshotFamillesellCollection;
    }

    public void setTSnapshotFamillesellCollection(Collection<TSnapshotFamillesell> tSnapshotFamillesellCollection) {
        this.tSnapshotFamillesellCollection = tSnapshotFamillesellCollection;
    }

    @XmlTransient
    public Collection<TSnapShopRuptureStock> getTSnapShopRuptureStockCollection() {
        return tSnapShopRuptureStockCollection;
    }

    public void setTSnapShopRuptureStockCollection(Collection<TSnapShopRuptureStock> tSnapShopRuptureStockCollection) {
        this.tSnapShopRuptureStockCollection = tSnapShopRuptureStockCollection;
    }

    @XmlTransient
    public Collection<TOrderDetail> getTOrderDetailCollection() {
        return tOrderDetailCollection;
    }

    public void setTOrderDetailCollection(Collection<TOrderDetail> tOrderDetailCollection) {
        this.tOrderDetailCollection = tOrderDetailCollection;
    }

    @XmlTransient
    public Collection<TFamilleDci> getTFamilleDciCollection() {
        return tFamilleDciCollection;
    }

    public void setTFamilleDciCollection(Collection<TFamilleDci> tFamilleDciCollection) {
        this.tFamilleDciCollection = tFamilleDciCollection;
    }

    @XmlTransient
    public Collection<TRetourdepotdetail> getTRetourdepotdetailCollection() {
        return tRetourdepotdetailCollection;
    }

    public void setTRetourdepotdetailCollection(Collection<TRetourdepotdetail> tRetourdepotdetailCollection) {
        this.tRetourdepotdetailCollection = tRetourdepotdetailCollection;
    }

    @XmlTransient
    public Collection<TEvaluationoffreprix> getTEvaluationoffreprixCollection() {
        return tEvaluationoffreprixCollection;
    }

    public void setTEvaluationoffreprixCollection(Collection<TEvaluationoffreprix> tEvaluationoffreprixCollection) {
        this.tEvaluationoffreprixCollection = tEvaluationoffreprixCollection;
    }

    public TIndicateurReapprovisionnement getLgINDICATEURREAPPROVISIONNEMENTID() {
        return lgINDICATEURREAPPROVISIONNEMENTID;
    }

    public void setLgINDICATEURREAPPROVISIONNEMENTID(TIndicateurReapprovisionnement lgINDICATEURREAPPROVISIONNEMENTID) {
        this.lgINDICATEURREAPPROVISIONNEMENTID = lgINDICATEURREAPPROVISIONNEMENTID;
    }

    public TRemise getLgREMISEID() {
        return lgREMISEID;
    }

    public void setLgREMISEID(TRemise lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    public TTypeetiquette getLgTYPEETIQUETTEID() {
        return lgTYPEETIQUETTEID;
    }

    public void setLgTYPEETIQUETTEID(TTypeetiquette lgTYPEETIQUETTEID) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
    }

    public TFabriquant getLgFABRIQUANTID() {
        return lgFABRIQUANTID;
    }

    public void setLgFABRIQUANTID(TFabriquant lgFABRIQUANTID) {
        this.lgFABRIQUANTID = lgFABRIQUANTID;
    }

    public TFormeArticle getLgFORMEID() {
        return lgFORMEID;
    }

    public void setLgFORMEID(TFormeArticle lgFORMEID) {
        this.lgFORMEID = lgFORMEID;
    }

    public TZoneGeographique getLgZONEGEOID() {
        return lgZONEGEOID;
    }

    public void setLgZONEGEOID(TZoneGeographique lgZONEGEOID) {
        this.lgZONEGEOID = lgZONEGEOID;
    }

    public TCodeGestion getLgCODEGESTIONID() {
        return lgCODEGESTIONID;
    }

    public void setLgCODEGESTIONID(TCodeGestion lgCODEGESTIONID) {
        this.lgCODEGESTIONID = lgCODEGESTIONID;
    }

    public TFamillearticle getLgFAMILLEARTICLEID() {
        return lgFAMILLEARTICLEID;
    }

    public void setLgFAMILLEARTICLEID(TFamillearticle lgFAMILLEARTICLEID) {
        this.lgFAMILLEARTICLEID = lgFAMILLEARTICLEID;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public TCodeActe getLgCODEACTEID() {
        return lgCODEACTEID;
    }

    public void setLgCODEACTEID(TCodeActe lgCODEACTEID) {
        this.lgCODEACTEID = lgCODEACTEID;
    }

    public TCodeTva getLgCODETVAID() {
        return lgCODETVAID;
    }

    public void setLgCODETVAID(TCodeTva lgCODETVAID) {
        this.lgCODETVAID = lgCODETVAID;
    }

    @XmlTransient
    public Collection<TMouvementprice> getTMouvementpriceCollection() {
        return tMouvementpriceCollection;
    }

    public void setTMouvementpriceCollection(Collection<TMouvementprice> tMouvementpriceCollection) {
        this.tMouvementpriceCollection = tMouvementpriceCollection;
    }

    @XmlTransient
    public Collection<TFamilleGrossiste> getTFamilleGrossisteCollection() {
        return tFamilleGrossisteCollection;
    }

    public void setTFamilleGrossisteCollection(Collection<TFamilleGrossiste> tFamilleGrossisteCollection) {
        this.tFamilleGrossisteCollection = tFamilleGrossisteCollection;
    }

    @XmlTransient
    public Collection<TPreenregistrementDetail> getTPreenregistrementDetailCollection() {
        return tPreenregistrementDetailCollection;
    }

    public void setTPreenregistrementDetailCollection(
            Collection<TPreenregistrementDetail> tPreenregistrementDetailCollection) {
        this.tPreenregistrementDetailCollection = tPreenregistrementDetailCollection;
    }

    @XmlTransient
    public Collection<TMouvement> getTMouvementCollection() {
        return tMouvementCollection;
    }

    public void setTMouvementCollection(Collection<TMouvement> tMouvementCollection) {
        this.tMouvementCollection = tMouvementCollection;
    }

    @XmlTransient
    public Collection<HMvtProduit> gethMvtProduits() {
        return hMvtProduits;
    }

    public void sethMvtProduits(Collection<HMvtProduit> hMvtProduits) {
        this.hMvtProduits = hMvtProduits;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFAMILLEID != null ? lgFAMILLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamille)) {
            return false;
        }
        TFamille other = (TFamille) object;
        return !((this.lgFAMILLEID == null && other.lgFAMILLEID != null)
                || (this.lgFAMILLEID != null && !this.lgFAMILLEID.equals(other.lgFAMILLEID)));
    }

    @Override
    public String toString() {
        return "dal.TFamille[ lgFAMILLEID=" + lgFAMILLEID + " ]";
    }

    public Short getBCODEINDICATEUR() {
        return bCODEINDICATEUR;
    }

    public void setBCODEINDICATEUR(Short bCODEINDICATEUR) {
        this.bCODEINDICATEUR = bCODEINDICATEUR;
    }

    public Short getIntORERSTATUS() {
        return intORERSTATUS;
    }

    public void setIntORERSTATUS(Short intORERSTATUS) {
        this.intORERSTATUS = intORERSTATUS;
    }

    public Boolean getBoolACCOUNT() {
        return boolACCOUNT;
    }

    public void setBoolACCOUNT(Boolean boolACCOUNT) {
        this.boolACCOUNT = boolACCOUNT;
    }

    public Optional<Integer> cmuPrice() {
        return this.cmuPrice != null ? Optional.of(this.cmuPrice) : Optional.of(0);
    }

}
