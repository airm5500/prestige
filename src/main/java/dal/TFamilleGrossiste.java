/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.UUID;
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
import toolkits.parameters.commonparameter;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_famille_grossiste")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFamilleGrossiste.findAll", query = "SELECT t FROM TFamilleGrossiste t"),
        @NamedQuery(name = "TFamilleGrossiste.findByLgFAMILLEGROSSISTEID", query = "SELECT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEGROSSISTEID = :lgFAMILLEGROSSISTEID"),
        @NamedQuery(name = "TFamilleGrossiste.findByStrCODEARTICLE", query = "SELECT t FROM TFamilleGrossiste t WHERE t.strCODEARTICLE = :strCODEARTICLE"),
        @NamedQuery(name = "TFamilleGrossiste.findByIntPRICE", query = "SELECT t FROM TFamilleGrossiste t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TFamilleGrossiste.findByBlRUPTURE", query = "SELECT t FROM TFamilleGrossiste t WHERE t.blRUPTURE = :blRUPTURE"),
        @NamedQuery(name = "TFamilleGrossiste.findByDtRUPTURE", query = "SELECT t FROM TFamilleGrossiste t WHERE t.dtRUPTURE = :dtRUPTURE"),
        @NamedQuery(name = "TFamilleGrossiste.findByIntNBRERUPTURE", query = "SELECT t FROM TFamilleGrossiste t WHERE t.intNBRERUPTURE = :intNBRERUPTURE"),
        @NamedQuery(name = "TFamilleGrossiste.findByStrSTATUT", query = "SELECT t FROM TFamilleGrossiste t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TFamilleGrossiste.findByDtCREATED", query = "SELECT t FROM TFamilleGrossiste t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFamilleGrossiste.findByDtUPDATED", query = "SELECT t FROM TFamilleGrossiste t WHERE t.dtUPDATED = :dtUPDATED") })
public class TFamilleGrossiste implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_GROSSISTE_ID", nullable = false, length = 40)
    private String lgFAMILLEGROSSISTEID = UUID.randomUUID().toString();
    @Column(name = "str_CODE_ARTICLE", length = 20)
    private String strCODEARTICLE;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "bl_RUPTURE")
    private Boolean blRUPTURE = Boolean.FALSE;
    @Column(name = "dt_RUPTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtRUPTURE;
    @Column(name = "int_NBRE_RUPTURE")
    private Integer intNBRERUPTURE;
    @Column(name = "int_PAF")
    private Integer intPAF;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT = commonparameter.statut_enable;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED = new Date();
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    public TFamilleGrossiste() {
    }

    public TFamilleGrossiste(String lgFAMILLEGROSSISTEID) {
        this.lgFAMILLEGROSSISTEID = lgFAMILLEGROSSISTEID;
    }

    public String getLgFAMILLEGROSSISTEID() {
        return lgFAMILLEGROSSISTEID;
    }

    public void setLgFAMILLEGROSSISTEID(String lgFAMILLEGROSSISTEID) {
        this.lgFAMILLEGROSSISTEID = lgFAMILLEGROSSISTEID;
    }

    public String getStrCODEARTICLE() {
        return strCODEARTICLE;
    }

    public void setStrCODEARTICLE(String strCODEARTICLE) {
        this.strCODEARTICLE = strCODEARTICLE;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Boolean getBlRUPTURE() {
        return blRUPTURE;
    }

    public void setBlRUPTURE(Boolean blRUPTURE) {
        this.blRUPTURE = blRUPTURE;
    }

    public Date getDtRUPTURE() {
        return dtRUPTURE;
    }

    public void setDtRUPTURE(Date dtRUPTURE) {
        this.dtRUPTURE = dtRUPTURE;
    }

    public Integer getIntNBRERUPTURE() {
        return intNBRERUPTURE;
    }

    public void setIntNBRERUPTURE(Integer intNBRERUPTURE) {
        this.intNBRERUPTURE = intNBRERUPTURE;
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

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFAMILLEGROSSISTEID != null ? lgFAMILLEGROSSISTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamilleGrossiste)) {
            return false;
        }
        TFamilleGrossiste other = (TFamilleGrossiste) object;
        if ((this.lgFAMILLEGROSSISTEID == null && other.lgFAMILLEGROSSISTEID != null)
                || (this.lgFAMILLEGROSSISTEID != null
                        && !this.lgFAMILLEGROSSISTEID.equals(other.lgFAMILLEGROSSISTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFamilleGrossiste[ lgFAMILLEGROSSISTEID=" + lgFAMILLEGROSSISTEID + " ]";
    }

}
