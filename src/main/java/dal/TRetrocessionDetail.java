/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_retrocession_detail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRetrocessionDetail.findAll", query = "SELECT t FROM TRetrocessionDetail t"),
        @NamedQuery(name = "TRetrocessionDetail.findByLgRETROCESSIONDETAILID", query = "SELECT t FROM TRetrocessionDetail t WHERE t.lgRETROCESSIONDETAILID = :lgRETROCESSIONDETAILID"),
        @NamedQuery(name = "TRetrocessionDetail.findByIntQtefacture", query = "SELECT t FROM TRetrocessionDetail t WHERE t.intQtefacture = :intQtefacture"),
        @NamedQuery(name = "TRetrocessionDetail.findByBoolTF", query = "SELECT t FROM TRetrocessionDetail t WHERE t.boolTF = :boolTF"),
        @NamedQuery(name = "TRetrocessionDetail.findByIntPRICE", query = "SELECT t FROM TRetrocessionDetail t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TRetrocessionDetail.findByIntREMISE", query = "SELECT t FROM TRetrocessionDetail t WHERE t.intREMISE = :intREMISE"),
        @NamedQuery(name = "TRetrocessionDetail.findByStrSTATUT", query = "SELECT t FROM TRetrocessionDetail t WHERE t.strSTATUT = :strSTATUT") })
public class TRetrocessionDetail implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RETROCESSIONDETAIL_ID", nullable = false, length = 20)
    private String lgRETROCESSIONDETAILID;
    @Column(name = "int_Qte_facture")
    private Integer intQtefacture;
    @Column(name = "bool_T_F")
    private Boolean boolTF;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_REMISE")
    private Integer intREMISE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @JoinColumn(name = "lg_RETROCESSION_ID", referencedColumnName = "lg_RETROCESSION_ID")
    @ManyToOne
    private TRetrocession lgRETROCESSIONID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    public TRetrocessionDetail() {
    }

    public TRetrocessionDetail(String lgRETROCESSIONDETAILID) {
        this.lgRETROCESSIONDETAILID = lgRETROCESSIONDETAILID;
    }

    public String getLgRETROCESSIONDETAILID() {
        return lgRETROCESSIONDETAILID;
    }

    public void setLgRETROCESSIONDETAILID(String lgRETROCESSIONDETAILID) {
        this.lgRETROCESSIONDETAILID = lgRETROCESSIONDETAILID;
    }

    public Integer getIntQtefacture() {
        return intQtefacture;
    }

    public void setIntQtefacture(Integer intQtefacture) {
        this.intQtefacture = intQtefacture;
    }

    public Boolean getBoolTF() {
        return boolTF;
    }

    public void setBoolTF(Boolean boolTF) {
        this.boolTF = boolTF;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntREMISE() {
        return intREMISE;
    }

    public void setIntREMISE(Integer intREMISE) {
        this.intREMISE = intREMISE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public TRetrocession getLgRETROCESSIONID() {
        return lgRETROCESSIONID;
    }

    public void setLgRETROCESSIONID(TRetrocession lgRETROCESSIONID) {
        this.lgRETROCESSIONID = lgRETROCESSIONID;
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
        hash += (lgRETROCESSIONDETAILID != null ? lgRETROCESSIONDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRetrocessionDetail)) {
            return false;
        }
        TRetrocessionDetail other = (TRetrocessionDetail) object;
        if ((this.lgRETROCESSIONDETAILID == null && other.lgRETROCESSIONDETAILID != null)
                || (this.lgRETROCESSIONDETAILID != null
                        && !this.lgRETROCESSIONDETAILID.equals(other.lgRETROCESSIONDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRetrocessionDetail[ lgRETROCESSIONDETAILID=" + lgRETROCESSIONDETAILID + " ]";
    }

}
