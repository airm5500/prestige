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
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_famille_history", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFamilleHistory.findAll", query = "SELECT t FROM TFamilleHistory t"),
        @NamedQuery(name = "TFamilleHistory.findByLgID", query = "SELECT t FROM TFamilleHistory t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TFamilleHistory.findByLgFAMILLEID", query = "SELECT t FROM TFamilleHistory t WHERE t.lgFAMILLEID = :lgFAMILLEID"),
        @NamedQuery(name = "TFamilleHistory.findByIntPRICE", query = "SELECT t FROM TFamilleHistory t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TFamilleHistory.findByIntPRICETIPS", query = "SELECT t FROM TFamilleHistory t WHERE t.intPRICETIPS = :intPRICETIPS"),
        @NamedQuery(name = "TFamilleHistory.findByIntPAF", query = "SELECT t FROM TFamilleHistory t WHERE t.intPAF = :intPAF"),
        @NamedQuery(name = "TFamilleHistory.findByIntPAT", query = "SELECT t FROM TFamilleHistory t WHERE t.intPAT = :intPAT"),
        @NamedQuery(name = "TFamilleHistory.findByIntTAUXMARQUE", query = "SELECT t FROM TFamilleHistory t WHERE t.intTAUXMARQUE = :intTAUXMARQUE"),
        @NamedQuery(name = "TFamilleHistory.findByLgGROSSISTEID", query = "SELECT t FROM TFamilleHistory t WHERE t.lgGROSSISTEID = :lgGROSSISTEID"),
        @NamedQuery(name = "TFamilleHistory.findByDtCREATED", query = "SELECT t FROM TFamilleHistory t WHERE t.dtCREATED = :dtCREATED") })
public class TFamilleHistory implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false)
    private Integer lgID;
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_ID", nullable = false, length = 30)
    private String lgFAMILLEID;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_TIPS")
    private Integer intPRICETIPS;
    @Column(name = "int_PAF")
    private Integer intPAF;
    @Column(name = "int_PAT")
    private Integer intPAT;
    @Column(name = "int_TAUX_MARQUE")
    private Integer intTAUXMARQUE;
    @Column(name = "lg_GROSSISTE_ID", length = 20)
    private String lgGROSSISTEID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    public TFamilleHistory() {
    }

    public TFamilleHistory(Integer lgID) {
        this.lgID = lgID;
    }

    public TFamilleHistory(Integer lgID, String lgFAMILLEID) {
        this.lgID = lgID;
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public Integer getLgID() {
        return lgID;
    }

    public void setLgID(Integer lgID) {
        this.lgID = lgID;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
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

    public Integer getIntTAUXMARQUE() {
        return intTAUXMARQUE;
    }

    public void setIntTAUXMARQUE(Integer intTAUXMARQUE) {
        this.intTAUXMARQUE = intTAUXMARQUE;
    }

    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgID != null ? lgID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamilleHistory)) {
            return false;
        }
        TFamilleHistory other = (TFamilleHistory) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFamilleHistory[ lgID=" + lgID + " ]";
    }

}
