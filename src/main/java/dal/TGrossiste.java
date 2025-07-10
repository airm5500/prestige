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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_grossiste", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_GROSSISTE_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TGrossiste.findAll", query = "SELECT t FROM TGrossiste t"),
        @NamedQuery(name = "TGrossiste.findByLgGROSSISTEID", query = "SELECT t FROM TGrossiste t WHERE t.lgGROSSISTEID = :lgGROSSISTEID"),
        @NamedQuery(name = "TGrossiste.findByStrLIBELLE", query = "SELECT t FROM TGrossiste t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TGrossiste.findByStrCODE", query = "SELECT t FROM TGrossiste t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TGrossiste.findByStrDESCRIPTION", query = "SELECT t FROM TGrossiste t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TGrossiste.findByStrADRESSERUE1", query = "SELECT t FROM TGrossiste t WHERE t.strADRESSERUE1 = :strADRESSERUE1"),
        @NamedQuery(name = "TGrossiste.findByStrADRESSERUE2", query = "SELECT t FROM TGrossiste t WHERE t.strADRESSERUE2 = :strADRESSERUE2"),
        @NamedQuery(name = "TGrossiste.findByStrCODEPOSTAL", query = "SELECT t FROM TGrossiste t WHERE t.strCODEPOSTAL = :strCODEPOSTAL"),
        @NamedQuery(name = "TGrossiste.findByStrBUREAUDISTRIBUTEUR", query = "SELECT t FROM TGrossiste t WHERE t.strBUREAUDISTRIBUTEUR = :strBUREAUDISTRIBUTEUR"),
        @NamedQuery(name = "TGrossiste.findByStrMOBILE", query = "SELECT t FROM TGrossiste t WHERE t.strMOBILE = :strMOBILE"),
        @NamedQuery(name = "TGrossiste.findByStrTELEPHONE", query = "SELECT t FROM TGrossiste t WHERE t.strTELEPHONE = :strTELEPHONE"),
        @NamedQuery(name = "TGrossiste.findByIntDELAIREGLEMENTAUTORISE", query = "SELECT t FROM TGrossiste t WHERE t.intDELAIREGLEMENTAUTORISE = :intDELAIREGLEMENTAUTORISE"),
        @NamedQuery(name = "TGrossiste.findByIntDELAIREAPPROVISIONNEMENT", query = "SELECT t FROM TGrossiste t WHERE t.intDELAIREAPPROVISIONNEMENT = :intDELAIREAPPROVISIONNEMENT"),
        @NamedQuery(name = "TGrossiste.findByIntCOEFSECURITY", query = "SELECT t FROM TGrossiste t WHERE t.intCOEFSECURITY = :intCOEFSECURITY"),
        @NamedQuery(name = "TGrossiste.findByIntDATEBUTOIRARTICLE", query = "SELECT t FROM TGrossiste t WHERE t.intDATEBUTOIRARTICLE = :intDATEBUTOIRARTICLE"),
        @NamedQuery(name = "TGrossiste.findByDblCHIFFREDAFFAIRE", query = "SELECT t FROM TGrossiste t WHERE t.dblCHIFFREDAFFAIRE = :dblCHIFFREDAFFAIRE"),
        @NamedQuery(name = "TGrossiste.findByStrURLEXTRANET", query = "SELECT t FROM TGrossiste t WHERE t.strURLEXTRANET = :strURLEXTRANET"),
        @NamedQuery(name = "TGrossiste.findByStrURLPHARMAML", query = "SELECT t FROM TGrossiste t WHERE t.strURLPHARMAML = :strURLPHARMAML"),
        @NamedQuery(name = "TGrossiste.findByStrIPGROSSISTE", query = "SELECT t FROM TGrossiste t WHERE t.strIPGROSSISTE = :strIPGROSSISTE"),
        @NamedQuery(name = "TGrossiste.findByStrSTATUT", query = "SELECT t FROM TGrossiste t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TGrossiste.findByDtCREATED", query = "SELECT t FROM TGrossiste t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TGrossiste.findByDtUPDATED", query = "SELECT t FROM TGrossiste t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TGrossiste.findByBoolUSEPHARMA", query = "SELECT t FROM TGrossiste t WHERE t.boolUSEPHARMA = :boolUSEPHARMA"),
        @NamedQuery(name = "TGrossiste.findByStrCODERECEPTEURPHARMA", query = "SELECT t FROM TGrossiste t WHERE t.strCODERECEPTEURPHARMA = :strCODERECEPTEURPHARMA"),
        @NamedQuery(name = "TGrossiste.findByStrIDRECEPTEURPHARMA", query = "SELECT t FROM TGrossiste t WHERE t.strIDRECEPTEURPHARMA = :strIDRECEPTEURPHARMA"),
        @NamedQuery(name = "TGrossiste.findByStrEMETTEURID", query = "SELECT t FROM TGrossiste t WHERE t.strEMETTEURID = :strEMETTEURID"),
        @NamedQuery(name = "TGrossiste.findByStrCLERECEPTEUR", query = "SELECT t FROM TGrossiste t WHERE t.strCLERECEPTEUR = :strCLERECEPTEUR"),
        @NamedQuery(name = "TGrossiste.findByStrURLRECEPTEUR", query = "SELECT t FROM TGrossiste t WHERE t.strURLRECEPTEUR = :strURLRECEPTEUR"),
        @NamedQuery(name = "TGrossiste.findByStrOFFICINEID", query = "SELECT t FROM TGrossiste t WHERE t.strOFFICINEID = :strOFFICINEID") })
public class TGrossiste implements Serializable {

    // @OneToMany( mappedBy = "lgGROSSISTEID")
    // private Collection<TQuinzaine> tQuinzaineCollection;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_GROSSISTE_ID", nullable = false, length = 40)
    private String lgGROSSISTEID;
    @Column(name = "str_LIBELLE", length = 50)
    private String strLIBELLE;
    @Column(name = "str_CODE", length = 50)
    private String strCODE;
    @Column(name = "str_DESCRIPTION", length = 50)
    private String strDESCRIPTION;
    @Column(name = "str_ADRESSE_RUE_1", length = 40)
    private String strADRESSERUE1;
    @Column(name = "str_ADRESSE_RUE_2", length = 40)
    private String strADRESSERUE2;
    @Column(name = "str_CODE_POSTAL", length = 20)
    private String strCODEPOSTAL;
    @Column(name = "str_BUREAU_DISTRIBUTEUR", length = 20)
    private String strBUREAUDISTRIBUTEUR;
    @Column(name = "str_MOBILE", length = 20)
    private String strMOBILE;
    @Column(name = "str_TELEPHONE", length = 20)
    private String strTELEPHONE;
    @Column(name = "int_DELAI_REGLEMENT_AUTORISE")
    private Integer intDELAIREGLEMENTAUTORISE;
    @Column(name = "int_DELAI_REAPPROVISIONNEMENT")
    private Integer intDELAIREAPPROVISIONNEMENT;
    @Column(name = "int_COEF_SECURITY")
    private Integer intCOEFSECURITY;
    @Column(name = "int_DATE_BUTOIR_ARTICLE")
    private Integer intDATEBUTOIRARTICLE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_CHIFFRE_DAFFAIRE", precision = 15, scale = 2)
    private Double dblCHIFFREDAFFAIRE;
    @Column(name = "str_URL_EXTRANET", length = 100)
    private String strURLEXTRANET;
    @Column(name = "str_URL_PHARMAML", length = 100)
    private String strURLPHARMAML;
    @Column(name = "str_IP_GROSSISTE", length = 20)
    private String strIPGROSSISTE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Basic(optional = false)
    @Column(name = "str_CODE_RECEPTEUR_PHARMA", nullable = false, length = 2)
    private String strCODERECEPTEURPHARMA;// utilser dans phamaMl code grossiste RECEPTEUR(code)
                                          // DESTINATAIRE(code_societe)
    @Basic(optional = false)
    @Column(name = "str_ID_RECEPTEUR_PHARMA", nullable = false, length = 8)
    private String strIDRECEPTEURPHARMA;// Code de l'officine chez le grossiste dans EMETTEUR(id,Id_Client)
    @Basic(optional = false)
    @Column(name = "str_EMETTEUR_ID", nullable = false, length = 40)
    private String strEMETTEURID;
    @Basic(optional = false)
    @Column(name = "str_CLE_RECEPTEUR", nullable = false, length = 10)
    private String strCLERECEPTEUR;
    @Basic(optional = false)
    @Column(name = "str_URL_RECEPTEUR", nullable = false, length = 50)
    private String strURLRECEPTEUR;
    @Basic(optional = false)
    @Column(name = "str_OFFICINE_ID", nullable = false, length = 40)
    private String strOFFICINEID;//
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TOrder> tOrderCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TRetourFournisseur> tRetourFournisseurCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TWarehouse> tWarehouseCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TSuggestionOrderDetails> tSuggestionOrderDetailsCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TSuggestionOrder> tSuggestionOrderCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TLot> tLotCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TOrderDetail> tOrderDetailCollection;
    @JoinColumn(name = "lg_VILLE_ID", referencedColumnName = "lg_VILLE_ID")
    @ManyToOne
    private TVille lgVILLEID;
    @JoinColumn(name = "lg_TYPE_REGLEMENT_ID", referencedColumnName = "lg_TYPE_REGLEMENT_ID")
    @ManyToOne
    private TTypeReglement lgTYPEREGLEMENTID;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TFamille> tFamilleCollection;
    @OneToMany(mappedBy = "lgGROSSISTEID")
    private Collection<TFamilleGrossiste> tFamilleGrossisteCollection;
    @Column(name = "bool_USE_PHARMA")
    private Boolean boolUSEPHARMA;
    @JoinColumn(name = "groupeId", referencedColumnName = "id", nullable = true)
    @ManyToOne
    private Groupefournisseur groupeId;
    @Column(name = "idrepartiteur", length = 100)
    private String idRepartiteur;// Id de agence grossiste, utliser dans pharamaml RECEPTEUR (Id) DESTINATAIRE
                                 // (Id_Societe)

    public TGrossiste() {
    }

    public String getIdRepartiteur() {
        return idRepartiteur;
    }

    public void setIdRepartiteur(String idRepartiteur) {
        this.idRepartiteur = idRepartiteur;
    }

    public TGrossiste(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public TGrossiste(String lgGROSSISTEID, boolean boolUSEPHARMA, String strCODERECEPTEURPHARMA,
            String strIDRECEPTEURPHARMA, String strEMETTEURID, String strCLERECEPTEUR, String strURLRECEPTEUR,
            String strOFFICINEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
        this.boolUSEPHARMA = boolUSEPHARMA;
        this.strCODERECEPTEURPHARMA = strCODERECEPTEURPHARMA;
        this.strIDRECEPTEURPHARMA = strIDRECEPTEURPHARMA;
        this.strEMETTEURID = strEMETTEURID;
        this.strCLERECEPTEUR = strCLERECEPTEUR;
        this.strURLRECEPTEUR = strURLRECEPTEUR;
        this.strOFFICINEID = strOFFICINEID;
    }

    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrADRESSERUE1() {
        return strADRESSERUE1;
    }

    public void setStrADRESSERUE1(String strADRESSERUE1) {
        this.strADRESSERUE1 = strADRESSERUE1;
    }

    public String getStrADRESSERUE2() {
        return strADRESSERUE2;
    }

    public void setStrADRESSERUE2(String strADRESSERUE2) {
        this.strADRESSERUE2 = strADRESSERUE2;
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

    public Integer getIntDELAIREGLEMENTAUTORISE() {
        return intDELAIREGLEMENTAUTORISE;
    }

    public void setIntDELAIREGLEMENTAUTORISE(Integer intDELAIREGLEMENTAUTORISE) {
        this.intDELAIREGLEMENTAUTORISE = intDELAIREGLEMENTAUTORISE;
    }

    public Integer getIntDELAIREAPPROVISIONNEMENT() {
        return intDELAIREAPPROVISIONNEMENT;
    }

    public void setIntDELAIREAPPROVISIONNEMENT(Integer intDELAIREAPPROVISIONNEMENT) {
        this.intDELAIREAPPROVISIONNEMENT = intDELAIREAPPROVISIONNEMENT;
    }

    public Integer getIntCOEFSECURITY() {
        return intCOEFSECURITY;
    }

    public void setIntCOEFSECURITY(Integer intCOEFSECURITY) {
        this.intCOEFSECURITY = intCOEFSECURITY;
    }

    public Integer getIntDATEBUTOIRARTICLE() {
        return intDATEBUTOIRARTICLE;
    }

    public void setIntDATEBUTOIRARTICLE(Integer intDATEBUTOIRARTICLE) {
        this.intDATEBUTOIRARTICLE = intDATEBUTOIRARTICLE;
    }

    public Double getDblCHIFFREDAFFAIRE() {
        return dblCHIFFREDAFFAIRE;
    }

    public void setDblCHIFFREDAFFAIRE(Double dblCHIFFREDAFFAIRE) {
        this.dblCHIFFREDAFFAIRE = dblCHIFFREDAFFAIRE;
    }

    public String getStrURLEXTRANET() {
        return strURLEXTRANET;
    }

    public void setStrURLEXTRANET(String strURLEXTRANET) {
        this.strURLEXTRANET = strURLEXTRANET;
    }

    public String getStrURLPHARMAML() {
        return strURLPHARMAML;
    }

    public void setStrURLPHARMAML(String strURLPHARMAML) {
        this.strURLPHARMAML = strURLPHARMAML;
    }

    public String getStrIPGROSSISTE() {
        return strIPGROSSISTE;
    }

    public void setStrIPGROSSISTE(String strIPGROSSISTE) {
        this.strIPGROSSISTE = strIPGROSSISTE;
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

    public boolean getBoolUSEPHARMA() {
        return boolUSEPHARMA;
    }

    public void setBoolUSEPHARMA(boolean boolUSEPHARMA) {
        this.boolUSEPHARMA = boolUSEPHARMA;
    }

    public String getStrCODERECEPTEURPHARMA() {
        return strCODERECEPTEURPHARMA;
    }

    public void setStrCODERECEPTEURPHARMA(String strCODERECEPTEURPHARMA) {
        this.strCODERECEPTEURPHARMA = strCODERECEPTEURPHARMA;
    }

    public String getStrIDRECEPTEURPHARMA() {
        return strIDRECEPTEURPHARMA;
    }

    public void setStrIDRECEPTEURPHARMA(String strIDRECEPTEURPHARMA) {
        this.strIDRECEPTEURPHARMA = strIDRECEPTEURPHARMA;
    }

    public String getStrEMETTEURID() {
        return strEMETTEURID;
    }

    public void setStrEMETTEURID(String strEMETTEURID) {
        this.strEMETTEURID = strEMETTEURID;
    }

    public String getStrCLERECEPTEUR() {
        return strCLERECEPTEUR;
    }

    public void setStrCLERECEPTEUR(String strCLERECEPTEUR) {
        this.strCLERECEPTEUR = strCLERECEPTEUR;
    }

    public String getStrURLRECEPTEUR() {
        return strURLRECEPTEUR;
    }

    public void setStrURLRECEPTEUR(String strURLRECEPTEUR) {
        this.strURLRECEPTEUR = strURLRECEPTEUR;
    }

    public String getStrOFFICINEID() {
        return strOFFICINEID;
    }

    public void setStrOFFICINEID(String strOFFICINEID) {
        this.strOFFICINEID = strOFFICINEID;
    }

    @XmlTransient
    public Collection<TOrder> getTOrderCollection() {
        return tOrderCollection;
    }

    public void setTOrderCollection(Collection<TOrder> tOrderCollection) {
        this.tOrderCollection = tOrderCollection;
    }

    @XmlTransient
    public Collection<TRetourFournisseur> getTRetourFournisseurCollection() {
        return tRetourFournisseurCollection;
    }

    public void setTRetourFournisseurCollection(Collection<TRetourFournisseur> tRetourFournisseurCollection) {
        this.tRetourFournisseurCollection = tRetourFournisseurCollection;
    }

    @XmlTransient
    public Collection<TBonLivraisonDetail> getTBonLivraisonDetailCollection() {
        return tBonLivraisonDetailCollection;
    }

    public void setTBonLivraisonDetailCollection(Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection) {
        this.tBonLivraisonDetailCollection = tBonLivraisonDetailCollection;
    }

    @XmlTransient
    public Collection<TWarehouse> getTWarehouseCollection() {
        return tWarehouseCollection;
    }

    public void setTWarehouseCollection(Collection<TWarehouse> tWarehouseCollection) {
        this.tWarehouseCollection = tWarehouseCollection;
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
    public Collection<TSuggestionOrder> getTSuggestionOrderCollection() {
        return tSuggestionOrderCollection;
    }

    public void setTSuggestionOrderCollection(Collection<TSuggestionOrder> tSuggestionOrderCollection) {
        this.tSuggestionOrderCollection = tSuggestionOrderCollection;
    }

    @XmlTransient
    public Collection<TLot> getTLotCollection() {
        return tLotCollection;
    }

    public void setTLotCollection(Collection<TLot> tLotCollection) {
        this.tLotCollection = tLotCollection;
    }

    @XmlTransient
    public Collection<TOrderDetail> getTOrderDetailCollection() {
        return tOrderDetailCollection;
    }

    public void setTOrderDetailCollection(Collection<TOrderDetail> tOrderDetailCollection) {
        this.tOrderDetailCollection = tOrderDetailCollection;
    }

    public TVille getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(TVille lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public TTypeReglement getLgTYPEREGLEMENTID() {
        return lgTYPEREGLEMENTID;
    }

    public void setLgTYPEREGLEMENTID(TTypeReglement lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
    }

    @XmlTransient
    public Collection<TFamille> getTFamilleCollection() {
        return tFamilleCollection;
    }

    public void setTFamilleCollection(Collection<TFamille> tFamilleCollection) {
        this.tFamilleCollection = tFamilleCollection;
    }

    @XmlTransient
    public Collection<TFamilleGrossiste> getTFamilleGrossisteCollection() {
        return tFamilleGrossisteCollection;
    }

    public void setTFamilleGrossisteCollection(Collection<TFamilleGrossiste> tFamilleGrossisteCollection) {
        this.tFamilleGrossisteCollection = tFamilleGrossisteCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgGROSSISTEID != null ? lgGROSSISTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TGrossiste)) {
            return false;
        }
        TGrossiste other = (TGrossiste) object;
        if ((this.lgGROSSISTEID == null && other.lgGROSSISTEID != null)
                || (this.lgGROSSISTEID != null && !this.lgGROSSISTEID.equals(other.lgGROSSISTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TGrossiste[ lgGROSSISTEID=" + lgGROSSISTEID + " ]";
    }

    // @XmlTransient
    // public Collection<TQuinzaine> getTQuinzaineCollection() {
    // return tQuinzaineCollection;
    // }
    //
    // public void setTQuinzaineCollection(Collection<TQuinzaine> tQuinzaineCollection) {
    // this.tQuinzaineCollection = tQuinzaineCollection;
    // }
    //
    public void setBoolUSEPHARMA(Boolean boolUSEPHARMA) {
        this.boolUSEPHARMA = boolUSEPHARMA;
    }

    public Groupefournisseur getGroupeId() {
        return groupeId;
    }

    public void setGroupeId(Groupefournisseur groupeId) {
        this.groupeId = groupeId;
    }
}
