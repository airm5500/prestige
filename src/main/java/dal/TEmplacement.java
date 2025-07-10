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
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_emplacement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TEmplacement.findAll", query = "SELECT t FROM TEmplacement t"),
        @NamedQuery(name = "TEmplacement.findByLgEMPLACEMENTID", query = "SELECT t FROM TEmplacement t WHERE t.lgEMPLACEMENTID = :lgEMPLACEMENTID"),
        @NamedQuery(name = "TEmplacement.findByStrNAME", query = "SELECT t FROM TEmplacement t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TEmplacement.findByStrFIRSTNAME", query = "SELECT t FROM TEmplacement t WHERE t.strFIRSTNAME = :strFIRSTNAME"),
        @NamedQuery(name = "TEmplacement.findByStrREF", query = "SELECT t FROM TEmplacement t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TEmplacement.findByStrLASTNAME", query = "SELECT t FROM TEmplacement t WHERE t.strLASTNAME = :strLASTNAME"),
        @NamedQuery(name = "TEmplacement.findByStrPHONE", query = "SELECT t FROM TEmplacement t WHERE t.strPHONE = :strPHONE"),
        @NamedQuery(name = "TEmplacement.findByDtCREATED", query = "SELECT t FROM TEmplacement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TEmplacement.findByDtUPDATED", query = "SELECT t FROM TEmplacement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TEmplacement.findByStrSTATUT", query = "SELECT t FROM TEmplacement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TEmplacement.findByBoolSAMELOCATION", query = "SELECT t FROM TEmplacement t WHERE t.boolSAMELOCATION = :boolSAMELOCATION") })
public class TEmplacement implements Serializable {

    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TInventaire> tInventaireCollection;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_EMPLACEMENT_ID", nullable = false, length = 40)
    private String lgEMPLACEMENTID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;

    @Column(name = "str_DESCRIPTION", length = 255)
    private String strDESCRIPTION;

    @Column(name = "str_LOCALITE", length = 255)
    private String strLOCALITE;
    @Column(name = "str_FIRST_NAME", length = 50)
    private String strFIRSTNAME;
    @Column(name = "str_REF", length = 100)
    private String strREF;
    @Column(name = "str_LAST_NAME", length = 50)
    private String strLASTNAME;
    @Column(name = "str_PHONE", length = 20)
    private String strPHONE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "bool_SAME_LOCATION")
    private Boolean boolSAMELOCATION;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TZoneGeographique> tZoneGeographiqueCollection;
    @JoinColumn(name = "lg_TYPEDEPOT_ID", referencedColumnName = "lg_TYPEDEPOT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TTypedepot lgTYPEDEPOTID;
    @JoinColumn(name = "lg_COMPTE_CLIENT_ID", referencedColumnName = "lg_COMPTE_CLIENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TCompteClient lgCOMPTECLIENTID;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TEtiquette> tEtiquetteCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TFamilleZonegeo> tFamilleZonegeoCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TRetourdepot> tRetourdepotCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<THistorypreenregistrement> tHistorypreenregistrementCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TTypeStockFamille> tTypeStockFamilleCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TFamilleStock> tFamilleStockCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TMouvementSnapshot> tMouvementSnapshotCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TUser> tUserCollection;
    @OneToMany(mappedBy = "lgEMPLACEMENTID")
    private Collection<TMouvement> tMouvementCollection;

    public TEmplacement() {
    }

    public TEmplacement(String lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    public String getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(String lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
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

    public String getStrLOCALITE() {
        return strLOCALITE;
    }

    public void setStrLOCALITE(String strLOCALITE) {
        this.strLOCALITE = strLOCALITE;
    }

    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public void setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
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

    public Boolean getBoolSAMELOCATION() {
        return boolSAMELOCATION;
    }

    public void setBoolSAMELOCATION(Boolean boolSAMELOCATION) {
        this.boolSAMELOCATION = boolSAMELOCATION;
    }

    @XmlTransient
    public Collection<TZoneGeographique> getTZoneGeographiqueCollection() {
        return tZoneGeographiqueCollection;
    }

    public void setTZoneGeographiqueCollection(Collection<TZoneGeographique> tZoneGeographiqueCollection) {
        this.tZoneGeographiqueCollection = tZoneGeographiqueCollection;
    }

    public TTypedepot getLgTYPEDEPOTID() {
        return lgTYPEDEPOTID;
    }

    public void setLgTYPEDEPOTID(TTypedepot lgTYPEDEPOTID) {
        this.lgTYPEDEPOTID = lgTYPEDEPOTID;
    }

    public TCompteClient getLgCOMPTECLIENTID() {
        return lgCOMPTECLIENTID;
    }

    public void setLgCOMPTECLIENTID(TCompteClient lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    @XmlTransient
    public Collection<TEtiquette> getTEtiquetteCollection() {
        return tEtiquetteCollection;
    }

    public void setTEtiquetteCollection(Collection<TEtiquette> tEtiquetteCollection) {
        this.tEtiquetteCollection = tEtiquetteCollection;
    }

    @XmlTransient
    public Collection<TFamilleZonegeo> getTFamilleZonegeoCollection() {
        return tFamilleZonegeoCollection;
    }

    public void setTFamilleZonegeoCollection(Collection<TFamilleZonegeo> tFamilleZonegeoCollection) {
        this.tFamilleZonegeoCollection = tFamilleZonegeoCollection;
    }

    @XmlTransient
    public Collection<TRetourdepot> getTRetourdepotCollection() {
        return tRetourdepotCollection;
    }

    public void setTRetourdepotCollection(Collection<TRetourdepot> tRetourdepotCollection) {
        this.tRetourdepotCollection = tRetourdepotCollection;
    }

    @XmlTransient
    public Collection<THistorypreenregistrement> getTHistorypreenregistrementCollection() {
        return tHistorypreenregistrementCollection;
    }

    public void setTHistorypreenregistrementCollection(
            Collection<THistorypreenregistrement> tHistorypreenregistrementCollection) {
        this.tHistorypreenregistrementCollection = tHistorypreenregistrementCollection;
    }

    @XmlTransient
    public Collection<TTypeStockFamille> getTTypeStockFamilleCollection() {
        return tTypeStockFamilleCollection;
    }

    public void setTTypeStockFamilleCollection(Collection<TTypeStockFamille> tTypeStockFamilleCollection) {
        this.tTypeStockFamilleCollection = tTypeStockFamilleCollection;
    }

    @XmlTransient
    public Collection<TFamilleStock> getTFamilleStockCollection() {
        return tFamilleStockCollection;
    }

    public void setTFamilleStockCollection(Collection<TFamilleStock> tFamilleStockCollection) {
        this.tFamilleStockCollection = tFamilleStockCollection;
    }

    @XmlTransient
    public Collection<TMouvementSnapshot> getTMouvementSnapshotCollection() {
        return tMouvementSnapshotCollection;
    }

    public void setTMouvementSnapshotCollection(Collection<TMouvementSnapshot> tMouvementSnapshotCollection) {
        this.tMouvementSnapshotCollection = tMouvementSnapshotCollection;
    }

    @XmlTransient
    public Collection<TUser> getTUserCollection() {
        return tUserCollection;
    }

    public void setTUserCollection(Collection<TUser> tUserCollection) {
        this.tUserCollection = tUserCollection;
    }

    @XmlTransient
    public Collection<TMouvement> getTMouvementCollection() {
        return tMouvementCollection;
    }

    public void setTMouvementCollection(Collection<TMouvement> tMouvementCollection) {
        this.tMouvementCollection = tMouvementCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgEMPLACEMENTID != null ? lgEMPLACEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEmplacement)) {
            return false;
        }
        TEmplacement other = (TEmplacement) object;
        if ((this.lgEMPLACEMENTID == null && other.lgEMPLACEMENTID != null)
                || (this.lgEMPLACEMENTID != null && !this.lgEMPLACEMENTID.equals(other.lgEMPLACEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEmplacement[ lgEMPLACEMENTID=" + lgEMPLACEMENTID + " ]";
    }

    @XmlTransient
    public Collection<TInventaire> getTInventaireCollection() {
        return tInventaireCollection;
    }

    public void setTInventaireCollection(Collection<TInventaire> tInventaireCollection) {
        this.tInventaireCollection = tInventaireCollection;
    }

}
