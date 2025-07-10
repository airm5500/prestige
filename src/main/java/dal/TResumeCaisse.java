/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
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

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_resume_caisse")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TResumeCaisse.findAll", query = "SELECT t FROM TResumeCaisse t"),
        @NamedQuery(name = "TResumeCaisse.findByLdCAISSEID", query = "SELECT t FROM TResumeCaisse t WHERE t.ldCAISSEID = :ldCAISSEID"),
        @NamedQuery(name = "TResumeCaisse.findByIntSOLDEMATIN", query = "SELECT t FROM TResumeCaisse t WHERE t.intSOLDEMATIN = :intSOLDEMATIN"),
        @NamedQuery(name = "TResumeCaisse.findByIntSOLDESOIR", query = "SELECT t FROM TResumeCaisse t WHERE t.intSOLDESOIR = :intSOLDESOIR"),
        @NamedQuery(name = "TResumeCaisse.findByDtDAY", query = "SELECT t FROM TResumeCaisse t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TResumeCaisse.findByDtCREATED", query = "SELECT t FROM TResumeCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TResumeCaisse.findByLgCREATEDBY", query = "SELECT t FROM TResumeCaisse t WHERE t.lgCREATEDBY = :lgCREATEDBY"),
        @NamedQuery(name = "TResumeCaisse.findByDtUPDATED", query = "SELECT t FROM TResumeCaisse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TResumeCaisse.findByLgUPDATEDBY", query = "SELECT t FROM TResumeCaisse t WHERE t.lgUPDATEDBY = :lgUPDATEDBY"),
        @NamedQuery(name = "TResumeCaisse.findByStrSTATUT", query = "SELECT t FROM TResumeCaisse t WHERE t.strSTATUT = :strSTATUT") })
public class TResumeCaisse implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ld_CAISSE_ID", nullable = false, length = 40)
    private String ldCAISSEID;
    @Column(name = "int_SOLDE_MATIN")
    private Integer intSOLDEMATIN;
    @Column(name = "int_SOLDE_SOIR")
    private Integer intSOLDESOIR;
    @Column(name = "dt_DAY")
    @Temporal(TemporalType.DATE)
    private Date dtDAY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "lg_CREATED_BY", length = 40)
    private String lgCREATEDBY;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "lg_UPDATED_BY", length = 40)
    private String lgUPDATEDBY;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "ID_COFFRE_CAISSE", referencedColumnName = "ID_COFFRE_CAISSE")
    @ManyToOne
    private TCoffreCaisse idCoffreCaisse;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @OneToMany(cascade = { CascadeType.REMOVE,
            CascadeType.PERSIST/* , CascadeType.MERGE */ }, mappedBy = "resumeCaisse")
    private List<LigneResumeCaisse> ligneResumeCaisses = new ArrayList<>();
    // 404 {"requestError":{"serviceException":{"messageId":"SVC0004","text":"No valid addresses provided in message
    // part %1","variables":["Invalid recipient address: tel:+22507 47 60 03 68","Only numeric phone number is
    // accepted"]}}} 07 47 60 03 68

    public TResumeCaisse() {
    }

    public TResumeCaisse(String ldCAISSEID) {
        this.ldCAISSEID = ldCAISSEID;
    }

    public String getLdCAISSEID() {
        return ldCAISSEID;
    }

    public void setLdCAISSEID(String ldCAISSEID) {
        this.ldCAISSEID = ldCAISSEID;
    }

    public Integer getIntSOLDEMATIN() {
        return intSOLDEMATIN;
    }

    public void setIntSOLDEMATIN(Integer intSOLDEMATIN) {
        this.intSOLDEMATIN = intSOLDEMATIN;
    }

    public Integer getIntSOLDESOIR() {
        return intSOLDESOIR;
    }

    public void setIntSOLDESOIR(Integer intSOLDESOIR) {
        this.intSOLDESOIR = intSOLDESOIR;
    }

    public Date getDtDAY() {
        return dtDAY;
    }

    public void setDtDAY(Date dtDAY) {
        this.dtDAY = dtDAY;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getLgCREATEDBY() {
        return lgCREATEDBY;
    }

    public void setLgCREATEDBY(String lgCREATEDBY) {
        this.lgCREATEDBY = lgCREATEDBY;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getLgUPDATEDBY() {
        return lgUPDATEDBY;
    }

    public void setLgUPDATEDBY(String lgUPDATEDBY) {
        this.lgUPDATEDBY = lgUPDATEDBY;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public TCoffreCaisse getIdCoffreCaisse() {
        return idCoffreCaisse;
    }

    public void setIdCoffreCaisse(TCoffreCaisse idCoffreCaisse) {
        this.idCoffreCaisse = idCoffreCaisse;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public List<LigneResumeCaisse> getLigneResumeCaisses() {
        return ligneResumeCaisses;
    }

    public void setLigneResumeCaisses(List<LigneResumeCaisse> ligneResumeCaisses) {
        this.ligneResumeCaisses = ligneResumeCaisses;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (ldCAISSEID != null ? ldCAISSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TResumeCaisse)) {
            return false;
        }
        TResumeCaisse other = (TResumeCaisse) object;
        if ((this.ldCAISSEID == null && other.ldCAISSEID != null)
                || (this.ldCAISSEID != null && !this.ldCAISSEID.equals(other.ldCAISSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TResumeCaisse[ ldCAISSEID=" + ldCAISSEID + " ]";
    }

}
