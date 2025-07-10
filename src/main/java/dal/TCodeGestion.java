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
@Table(name = "t_code_gestion")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCodeGestion.findAll", query = "SELECT t FROM TCodeGestion t"),
        @NamedQuery(name = "TCodeGestion.findByLgCODEGESTIONID", query = "SELECT t FROM TCodeGestion t WHERE t.lgCODEGESTIONID = :lgCODEGESTIONID"),
        @NamedQuery(name = "TCodeGestion.findByStrCODEBAREME", query = "SELECT t FROM TCodeGestion t WHERE t.strCODEBAREME = :strCODEBAREME"),
        @NamedQuery(name = "TCodeGestion.findByIntJOURSCOUVERTURESTOCK", query = "SELECT t FROM TCodeGestion t WHERE t.intJOURSCOUVERTURESTOCK = :intJOURSCOUVERTURESTOCK"),
        @NamedQuery(name = "TCodeGestion.findByIntMOISHISTORIQUEVENTE", query = "SELECT t FROM TCodeGestion t WHERE t.intMOISHISTORIQUEVENTE = :intMOISHISTORIQUEVENTE"),
        @NamedQuery(name = "TCodeGestion.findByIntDATEBUTOIRARTICLE", query = "SELECT t FROM TCodeGestion t WHERE t.intDATEBUTOIRARTICLE = :intDATEBUTOIRARTICLE"),
        @NamedQuery(name = "TCodeGestion.findByIntDATELIMITEEXTRAPOLATION", query = "SELECT t FROM TCodeGestion t WHERE t.intDATELIMITEEXTRAPOLATION = :intDATELIMITEEXTRAPOLATION"),
        @NamedQuery(name = "TCodeGestion.findByBoolOPTIMISATIONSEUILCMDE", query = "SELECT t FROM TCodeGestion t WHERE t.boolOPTIMISATIONSEUILCMDE = :boolOPTIMISATIONSEUILCMDE"),
        @NamedQuery(name = "TCodeGestion.findByIntCOEFFICIENTPONDERATION", query = "SELECT t FROM TCodeGestion t WHERE t.intCOEFFICIENTPONDERATION = :intCOEFFICIENTPONDERATION"),
        @NamedQuery(name = "TCodeGestion.findByStrSTATUT", query = "SELECT t FROM TCodeGestion t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TCodeGestion.findByDtCREATED", query = "SELECT t FROM TCodeGestion t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCodeGestion.findByDtUPDATED", query = "SELECT t FROM TCodeGestion t WHERE t.dtUPDATED = :dtUPDATED") })
public class TCodeGestion implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CODE_GESTION_ID", nullable = false, length = 40)
    private String lgCODEGESTIONID;
    @Column(name = "str_CODE_BAREME", length = 3)
    private String strCODEBAREME;
    @Column(name = "int_JOURS_COUVERTURE_STOCK")
    private Integer intJOURSCOUVERTURESTOCK;
    @Column(name = "int_MOIS_HISTORIQUE_VENTE")
    private Integer intMOISHISTORIQUEVENTE;
    @Column(name = "int_DATE_BUTOIR_ARTICLE")
    private Integer intDATEBUTOIRARTICLE;
    @Column(name = "int_DATE_LIMITE_EXTRAPOLATION")
    private Integer intDATELIMITEEXTRAPOLATION;
    @Column(name = "bool_OPTIMISATION_SEUIL_CMDE")
    private Boolean boolOPTIMISATIONSEUILCMDE;
    @Column(name = "int_COEFFICIENT_PONDERATION")
    private Integer intCOEFFICIENTPONDERATION;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgCODEGESTIONID")
    private Collection<TCoefficientPonderation> tCoefficientPonderationCollection;
    @JoinColumn(name = "lg_OPTIMISATION_QUANTITE_ID", referencedColumnName = "lg_OPTIMISATION_QUANTITE_ID")
    @ManyToOne
    private TOptimisationQuantite lgOPTIMISATIONQUANTITEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @OneToMany(mappedBy = "lgCODEGESTIONID")
    private Collection<TFamille> tFamilleCollection;

    public TCodeGestion() {
    }

    public TCodeGestion(String lgCODEGESTIONID) {
        this.lgCODEGESTIONID = lgCODEGESTIONID;
    }

    public String getLgCODEGESTIONID() {
        return lgCODEGESTIONID;
    }

    public void setLgCODEGESTIONID(String lgCODEGESTIONID) {
        this.lgCODEGESTIONID = lgCODEGESTIONID;
    }

    public String getStrCODEBAREME() {
        return strCODEBAREME;
    }

    public void setStrCODEBAREME(String strCODEBAREME) {
        this.strCODEBAREME = strCODEBAREME;
    }

    public Integer getIntJOURSCOUVERTURESTOCK() {
        return intJOURSCOUVERTURESTOCK;
    }

    public void setIntJOURSCOUVERTURESTOCK(Integer intJOURSCOUVERTURESTOCK) {
        this.intJOURSCOUVERTURESTOCK = intJOURSCOUVERTURESTOCK;
    }

    public Integer getIntMOISHISTORIQUEVENTE() {
        return intMOISHISTORIQUEVENTE;
    }

    public void setIntMOISHISTORIQUEVENTE(Integer intMOISHISTORIQUEVENTE) {
        this.intMOISHISTORIQUEVENTE = intMOISHISTORIQUEVENTE;
    }

    public Integer getIntDATEBUTOIRARTICLE() {
        return intDATEBUTOIRARTICLE;
    }

    public void setIntDATEBUTOIRARTICLE(Integer intDATEBUTOIRARTICLE) {
        this.intDATEBUTOIRARTICLE = intDATEBUTOIRARTICLE;
    }

    public Integer getIntDATELIMITEEXTRAPOLATION() {
        return intDATELIMITEEXTRAPOLATION;
    }

    public void setIntDATELIMITEEXTRAPOLATION(Integer intDATELIMITEEXTRAPOLATION) {
        this.intDATELIMITEEXTRAPOLATION = intDATELIMITEEXTRAPOLATION;
    }

    public Boolean getBoolOPTIMISATIONSEUILCMDE() {
        return boolOPTIMISATIONSEUILCMDE;
    }

    public void setBoolOPTIMISATIONSEUILCMDE(Boolean boolOPTIMISATIONSEUILCMDE) {
        this.boolOPTIMISATIONSEUILCMDE = boolOPTIMISATIONSEUILCMDE;
    }

    public Integer getIntCOEFFICIENTPONDERATION() {
        return intCOEFFICIENTPONDERATION;
    }

    public void setIntCOEFFICIENTPONDERATION(Integer intCOEFFICIENTPONDERATION) {
        this.intCOEFFICIENTPONDERATION = intCOEFFICIENTPONDERATION;
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

    @XmlTransient
    public Collection<TCoefficientPonderation> getTCoefficientPonderationCollection() {
        return tCoefficientPonderationCollection;
    }

    public void setTCoefficientPonderationCollection(
            Collection<TCoefficientPonderation> tCoefficientPonderationCollection) {
        this.tCoefficientPonderationCollection = tCoefficientPonderationCollection;
    }

    public TOptimisationQuantite getLgOPTIMISATIONQUANTITEID() {
        return lgOPTIMISATIONQUANTITEID;
    }

    public void setLgOPTIMISATIONQUANTITEID(TOptimisationQuantite lgOPTIMISATIONQUANTITEID) {
        this.lgOPTIMISATIONQUANTITEID = lgOPTIMISATIONQUANTITEID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @XmlTransient
    public Collection<TFamille> getTFamilleCollection() {
        return tFamilleCollection;
    }

    public void setTFamilleCollection(Collection<TFamille> tFamilleCollection) {
        this.tFamilleCollection = tFamilleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCODEGESTIONID != null ? lgCODEGESTIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCodeGestion)) {
            return false;
        }
        TCodeGestion other = (TCodeGestion) object;
        if ((this.lgCODEGESTIONID == null && other.lgCODEGESTIONID != null)
                || (this.lgCODEGESTIONID != null && !this.lgCODEGESTIONID.equals(other.lgCODEGESTIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCodeGestion[ lgCODEGESTIONID=" + lgCODEGESTIONID + " ]";
    }

}
