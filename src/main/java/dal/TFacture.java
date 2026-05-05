/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import java.util.List;
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
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_facture")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFacture.findAll", query = "SELECT t FROM TFacture t"),
        @NamedQuery(name = "TFacture.findByLgFACTUREID", query = "SELECT t FROM TFacture t WHERE t.lgFACTUREID = :lgFACTUREID"),
        @NamedQuery(name = "TFacture.findByDtDATEFACTURE", query = "SELECT t FROM TFacture t WHERE t.dtDATEFACTURE = :dtDATEFACTURE"),
        @NamedQuery(name = "TFacture.findByDblMONTANTCMDE", query = "SELECT t FROM TFacture t WHERE t.dblMONTANTCMDE = :dblMONTANTCMDE"),
        @NamedQuery(name = "TFacture.findByStrCODEFACTURE", query = "SELECT t FROM TFacture t WHERE t.strCODEFACTURE = :strCODEFACTURE"),
        @NamedQuery(name = "TFacture.findByStrCODECOMPTABLE", query = "SELECT t FROM TFacture t WHERE t.strCODECOMPTABLE = :strCODECOMPTABLE"),
        @NamedQuery(name = "TFacture.findByDblMONTANTPAYE", query = "SELECT t FROM TFacture t WHERE t.dblMONTANTPAYE = :dblMONTANTPAYE"),
        @NamedQuery(name = "TFacture.findByDtDEBUTFACTURE", query = "SELECT t FROM TFacture t WHERE t.dtDEBUTFACTURE = :dtDEBUTFACTURE"),
        @NamedQuery(name = "TFacture.findByIntNBDOSSIER", query = "SELECT t FROM TFacture t WHERE t.intNBDOSSIER = :intNBDOSSIER"),
        @NamedQuery(name = "TFacture.findByDtFINFACTURE", query = "SELECT t FROM TFacture t WHERE t.dtFINFACTURE = :dtFINFACTURE"),
        @NamedQuery(name = "TFacture.findByStrCUSTOMER", query = "SELECT t FROM TFacture t WHERE t.strCUSTOMER = :strCUSTOMER"),
        @NamedQuery(name = "TFacture.findByDblMONTANTRESTANT", query = "SELECT t FROM TFacture t WHERE t.dblMONTANTRESTANT = :dblMONTANTRESTANT"),
        @NamedQuery(name = "TFacture.findByStrSTATUT", query = "SELECT t FROM TFacture t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TFacture.findByDtCREATED", query = "SELECT t FROM TFacture t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFacture.findByDtUPDATED", query = "SELECT t FROM TFacture t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TFacture.findByStrPERE", query = "SELECT t FROM TFacture t WHERE t.strPERE = :strPERE"),
        @NamedQuery(name = "TFacture.findByDblMONTANTREMISE", query = "SELECT t FROM TFacture t WHERE t.dblMONTANTREMISE = :dblMONTANTREMISE"),
        @NamedQuery(name = "TFacture.findByDblMONTANTFOFETAIRE", query = "SELECT t FROM TFacture t WHERE t.dblMONTANTFOFETAIRE = :dblMONTANTFOFETAIRE"),
        @NamedQuery(name = "TFacture.findByDblMONTANTBrut", query = "SELECT t FROM TFacture t WHERE t.dblMONTANTBrut = :dblMONTANTBrut") })
public class TFacture implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FACTURE_ID", nullable = false, length = 40)
    private String lgFACTUREID;
    @Column(name = "dt_DATE_FACTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATEFACTURE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_MONTANT_CMDE", precision = 15, scale = 3)
    private Double dblMONTANTCMDE;
    @Column(name = "str_CODE_FACTURE", length = 40)
    private String strCODEFACTURE;
    @Column(name = "str_CODE_COMPTABLE", length = 40)
    private String strCODECOMPTABLE;
    @Column(name = "dbl_MONTANT_PAYE", precision = 15, scale = 3)
    private Double dblMONTANTPAYE;
    @Column(name = "dt_DEBUT_FACTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDEBUTFACTURE;
    @Column(name = "int_NB_DOSSIER")
    private Integer intNBDOSSIER;
    @Column(name = "dt_FIN_FACTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtFINFACTURE;
    @Column(name = "str_CUSTOMER", length = 40)
    private String strCUSTOMER;
    @Column(name = "dbl_MONTANT_RESTANT", precision = 15, scale = 3)
    private Double dblMONTANTRESTANT;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_PERE", length = 40)
    private String strPERE;
    @Column(name = "dbl_MONTANT_REMISE", precision = 15, scale = 3)
    private BigDecimal dblMONTANTREMISE;
    @Column(name = "dbl_MONTANT_FOFETAIRE", precision = 15, scale = 3)
    private BigDecimal dblMONTANTFOFETAIRE;
    @Column(name = "dbl_MONTANT_Brut", precision = 15, scale = 3)
    private BigDecimal dblMONTANTBrut;
    @OneToMany(mappedBy = "lgFACTUREID")
    private Collection<TBordereauDetail> tBordereauDetailCollection;
    @JoinColumn(name = "lg_TYPE_FACTURE_ID", referencedColumnName = "lg_TYPE_FACTURE_ID")
    @ManyToOne
    private TTypeFacture lgTYPEFACTUREID;
    @OneToMany(mappedBy = "lgFACTUREID")
    private Collection<TDossierReglement> tDossierReglementCollection;
    @OneToMany(mappedBy = "lgFACTUREID")
    private Collection<TFactureDetail> tFactureDetailCollection;
    @Column(name = "template")
    private Boolean template = Boolean.FALSE;
    @JoinColumn(name = "tiersPayant", referencedColumnName = "lg_TIERS_PAYANT_ID")
    @ManyToOne
    private TTiersPayant tiersPayant;
    @Column(name = "montantRemiseVente")
    private Integer montantRemiseVente = 0;
    @Column(name = "montantTvaVente")
    private Integer montantTvaVente = 0;
    @Column(name = "montantVente")
    private Integer montantVente = 0;
    @OneToMany(mappedBy = "lgFACTURESID")
    private List<TGroupeFactures> tGroupeFacturesList;
    @Column(name = "type_facture")
    private Integer typeFacture = 0;
    @Column(name = "type_facture_id", length = 50)
    private String typeFactureId;
    @Column(name = "fne_url", length = 500)
    private String fneUrl;
    @JoinColumn(name = "groupeTp_id", referencedColumnName = "lg_GROUPE_ID")
    @ManyToOne
    private TGroupeTierspayant groupeTierspayant;

    public TFacture() {
    }

    public String getFneUrl() {
        return fneUrl;
    }

    public void setFneUrl(String fneUrl) {
        this.fneUrl = fneUrl;
    }

    public TGroupeTierspayant getGroupeTierspayant() {
        return groupeTierspayant;
    }

    public void setGroupeTierspayant(TGroupeTierspayant groupeTierspayant) {
        this.groupeTierspayant = groupeTierspayant;
    }

    public String getTypeFactureId() {
        return typeFactureId;
    }

    public void setTypeFactureId(String typeFactureId) {
        this.typeFactureId = typeFactureId;
    }

    public Integer getMontantRemiseVente() {
        return montantRemiseVente;
    }

    public void setMontantRemiseVente(Integer montantRemiseVente) {
        this.montantRemiseVente = montantRemiseVente;
    }

    public Integer getMontantTvaVente() {
        return montantTvaVente;
    }

    public void setMontantTvaVente(Integer montantTvaVente) {
        this.montantTvaVente = montantTvaVente;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public TFacture(String lgFACTUREID) {
        this.lgFACTUREID = lgFACTUREID;
    }

    public String getLgFACTUREID() {
        return lgFACTUREID;
    }

    public void setLgFACTUREID(String lgFACTUREID) {
        this.lgFACTUREID = lgFACTUREID;
    }

    public Date getDtDATEFACTURE() {
        return dtDATEFACTURE;
    }

    public TTiersPayant getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(TTiersPayant tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public void setDtDATEFACTURE(Date dtDATEFACTURE) {
        this.dtDATEFACTURE = dtDATEFACTURE;
    }

    public Double getDblMONTANTCMDE() {
        return dblMONTANTCMDE;
    }

    public void setDblMONTANTCMDE(Double dblMONTANTCMDE) {
        this.dblMONTANTCMDE = dblMONTANTCMDE;
    }

    public String getStrCODEFACTURE() {
        return strCODEFACTURE;
    }

    public void setStrCODEFACTURE(String strCODEFACTURE) {
        this.strCODEFACTURE = strCODEFACTURE;
    }

    public String getStrCODECOMPTABLE() {
        return strCODECOMPTABLE;
    }

    public void setStrCODECOMPTABLE(String strCODECOMPTABLE) {
        this.strCODECOMPTABLE = strCODECOMPTABLE;
    }

    public Double getDblMONTANTPAYE() {
        return dblMONTANTPAYE;
    }

    public void setDblMONTANTPAYE(Double dblMONTANTPAYE) {
        this.dblMONTANTPAYE = dblMONTANTPAYE;
    }

    public Date getDtDEBUTFACTURE() {
        return dtDEBUTFACTURE;
    }

    public void setDtDEBUTFACTURE(Date dtDEBUTFACTURE) {
        this.dtDEBUTFACTURE = dtDEBUTFACTURE;
    }

    public Integer getIntNBDOSSIER() {
        return intNBDOSSIER;
    }

    public void setIntNBDOSSIER(Integer intNBDOSSIER) {
        this.intNBDOSSIER = intNBDOSSIER;
    }

    public Date getDtFINFACTURE() {
        return dtFINFACTURE;
    }

    public void setDtFINFACTURE(Date dtFINFACTURE) {
        this.dtFINFACTURE = dtFINFACTURE;
    }

    public String getStrCUSTOMER() {
        return strCUSTOMER;
    }

    public void setStrCUSTOMER(String strCUSTOMER) {
        this.strCUSTOMER = strCUSTOMER;
    }

    public Double getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Double dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
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

    public String getStrPERE() {
        return strPERE;
    }

    public void setStrPERE(String strPERE) {
        this.strPERE = strPERE;
    }

    public BigDecimal getDblMONTANTREMISE() {
        return dblMONTANTREMISE;
    }

    public void setDblMONTANTREMISE(BigDecimal dblMONTANTREMISE) {
        this.dblMONTANTREMISE = dblMONTANTREMISE;
    }

    public BigDecimal getDblMONTANTFOFETAIRE() {
        return dblMONTANTFOFETAIRE;
    }

    public void setDblMONTANTFOFETAIRE(BigDecimal dblMONTANTFOFETAIRE) {
        this.dblMONTANTFOFETAIRE = dblMONTANTFOFETAIRE;
    }

    public BigDecimal getDblMONTANTBrut() {
        return dblMONTANTBrut;
    }

    public void setDblMONTANTBrut(BigDecimal dblMONTANTBrut) {
        this.dblMONTANTBrut = dblMONTANTBrut;
    }

    @XmlTransient
    public Collection<TBordereauDetail> getTBordereauDetailCollection() {
        return tBordereauDetailCollection;
    }

    public void setTBordereauDetailCollection(Collection<TBordereauDetail> tBordereauDetailCollection) {
        this.tBordereauDetailCollection = tBordereauDetailCollection;
    }

    public TTypeFacture getLgTYPEFACTUREID() {
        return lgTYPEFACTUREID;
    }

    public void setLgTYPEFACTUREID(TTypeFacture lgTYPEFACTUREID) {
        this.lgTYPEFACTUREID = lgTYPEFACTUREID;
    }

    @XmlTransient
    public Collection<TDossierReglement> getTDossierReglementCollection() {
        return tDossierReglementCollection;
    }

    public void setTDossierReglementCollection(Collection<TDossierReglement> tDossierReglementCollection) {
        this.tDossierReglementCollection = tDossierReglementCollection;
    }

    @XmlTransient
    public Collection<TFactureDetail> getTFactureDetailCollection() {
        return tFactureDetailCollection;
    }

    public void setTFactureDetailCollection(Collection<TFactureDetail> tFactureDetailCollection) {
        this.tFactureDetailCollection = tFactureDetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFACTUREID != null ? lgFACTUREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFacture)) {
            return false;
        }
        TFacture other = (TFacture) object;
        return !((this.lgFACTUREID == null && other.lgFACTUREID != null)
                || (this.lgFACTUREID != null && !this.lgFACTUREID.equals(other.lgFACTUREID)));
    }

    @Override
    public String toString() {
        return "dal.TFacture[ lgFACTUREID=" + lgFACTUREID + " ]";
    }

    @XmlTransient
    public List<TGroupeFactures> getTGroupeFacturesList() {
        return tGroupeFacturesList;
    }

    public void setTGroupeFacturesList(List<TGroupeFactures> tGroupeFacturesList) {
        this.tGroupeFacturesList = tGroupeFacturesList;
    }

    public Boolean getTemplate() {
        return template;
    }

    public void setTemplate(Boolean template) {
        this.template = template;
    }

    public Integer getTypeFacture() {
        return typeFacture;
    }

    public void setTypeFacture(Integer typeFacture) {
        this.typeFacture = typeFacture;
    }

}
