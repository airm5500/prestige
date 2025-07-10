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
@Table(name = "t_ayant_droit")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TAyantDroit.findAll", query = "SELECT t FROM TAyantDroit t"),
        @NamedQuery(name = "TAyantDroit.findByLgAYANTSDROITSID", query = "SELECT t FROM TAyantDroit t WHERE t.lgAYANTSDROITSID = :lgAYANTSDROITSID"),
        @NamedQuery(name = "TAyantDroit.findByStrCODEINTERNE", query = "SELECT t FROM TAyantDroit t WHERE t.strCODEINTERNE = :strCODEINTERNE"),
        @NamedQuery(name = "TAyantDroit.findByStrFIRSTNAME", query = "SELECT t FROM TAyantDroit t WHERE t.strFIRSTNAME = :strFIRSTNAME"),
        @NamedQuery(name = "TAyantDroit.findByStrNUMEROSECURITESOCIAL", query = "SELECT t FROM TAyantDroit t WHERE t.strNUMEROSECURITESOCIAL = :strNUMEROSECURITESOCIAL"),
        @NamedQuery(name = "TAyantDroit.findByStrLASTNAME", query = "SELECT t FROM TAyantDroit t WHERE t.strLASTNAME = :strLASTNAME"),
        @NamedQuery(name = "TAyantDroit.findByDtNAISSANCE", query = "SELECT t FROM TAyantDroit t WHERE t.dtNAISSANCE = :dtNAISSANCE"),
        @NamedQuery(name = "TAyantDroit.findByStrSEXE", query = "SELECT t FROM TAyantDroit t WHERE t.strSEXE = :strSEXE"),
        @NamedQuery(name = "TAyantDroit.findByDtCREATED", query = "SELECT t FROM TAyantDroit t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TAyantDroit.findByDtUPDATED", query = "SELECT t FROM TAyantDroit t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TAyantDroit.findByStrSTATUT", query = "SELECT t FROM TAyantDroit t WHERE t.strSTATUT = :strSTATUT") })
public class TAyantDroit implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_AYANTS_DROITS_ID", nullable = false, length = 40)
    private String lgAYANTSDROITSID;
    @Column(name = "str_CODE_INTERNE", length = 40)
    private String strCODEINTERNE;
    @Column(name = "str_FIRST_NAME", length = 50)
    private String strFIRSTNAME;
    @Column(name = "str_NUMERO_SECURITE_SOCIAL", length = 50)
    private String strNUMEROSECURITESOCIAL;
    @Column(name = "str_LAST_NAME", length = 50)
    private String strLASTNAME;
    @Column(name = "dt_NAISSANCE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtNAISSANCE;
    @Column(name = "str_SEXE", length = 10)
    private String strSEXE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_RISQUE_ID", referencedColumnName = "lg_RISQUE_ID")
    @ManyToOne
    private TRisque lgRISQUEID;
    @JoinColumn(name = "lg_VILLE_ID", referencedColumnName = "lg_VILLE_ID")
    @ManyToOne
    private TVille lgVILLEID;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne(optional = false)
    private TClient lgCLIENTID;
    @JoinColumn(name = "lg_CATEGORIE_AYANTDROIT_ID", referencedColumnName = "lg_CATEGORIE_AYANTDROIT_ID")
    @ManyToOne
    private TCategorieAyantdroit lgCATEGORIEAYANTDROITID;

    public TAyantDroit() {
    }

    public TAyantDroit(String lgAYANTSDROITSID) {
        this.lgAYANTSDROITSID = lgAYANTSDROITSID;
    }

    public String getLgAYANTSDROITSID() {
        return lgAYANTSDROITSID;
    }

    public void setLgAYANTSDROITSID(String lgAYANTSDROITSID) {
        this.lgAYANTSDROITSID = lgAYANTSDROITSID;
    }

    public String getStrCODEINTERNE() {
        return strCODEINTERNE;
    }

    public void setStrCODEINTERNE(String strCODEINTERNE) {
        this.strCODEINTERNE = strCODEINTERNE;
    }

    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public void setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
    }

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    public String getStrLASTNAME() {
        return strLASTNAME;
    }

    public void setStrLASTNAME(String strLASTNAME) {
        this.strLASTNAME = strLASTNAME;
    }

    public Date getDtNAISSANCE() {
        return dtNAISSANCE;
    }

    public void setDtNAISSANCE(Date dtNAISSANCE) {
        this.dtNAISSANCE = dtNAISSANCE;
    }

    public String getStrSEXE() {
        return strSEXE;
    }

    public void setStrSEXE(String strSEXE) {
        this.strSEXE = strSEXE;
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

    public TRisque getLgRISQUEID() {
        return lgRISQUEID;
    }

    public void setLgRISQUEID(TRisque lgRISQUEID) {
        this.lgRISQUEID = lgRISQUEID;
    }

    public TVille getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(TVille lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public TClient getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(TClient lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    public TCategorieAyantdroit getLgCATEGORIEAYANTDROITID() {
        return lgCATEGORIEAYANTDROITID;
    }

    public void setLgCATEGORIEAYANTDROITID(TCategorieAyantdroit lgCATEGORIEAYANTDROITID) {
        this.lgCATEGORIEAYANTDROITID = lgCATEGORIEAYANTDROITID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgAYANTSDROITSID != null ? lgAYANTSDROITSID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TAyantDroit)) {
            return false;
        }
        TAyantDroit other = (TAyantDroit) object;
        if ((this.lgAYANTSDROITSID == null && other.lgAYANTSDROITSID != null)
                || (this.lgAYANTSDROITSID != null && !this.lgAYANTSDROITSID.equals(other.lgAYANTSDROITSID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TAyantDroit[ lgAYANTSDROITSID=" + lgAYANTSDROITSID + " ]";
    }

}
