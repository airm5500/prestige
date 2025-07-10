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
import javax.persistence.Lob;
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
@Table(name = "t_famillearticle", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_FAMILLEARTICLE_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFamillearticle.findAll", query = "SELECT t FROM TFamillearticle t"),
        @NamedQuery(name = "TFamillearticle.findByLgFAMILLEARTICLEID", query = "SELECT t FROM TFamillearticle t WHERE t.lgFAMILLEARTICLEID = :lgFAMILLEARTICLEID"),
        @NamedQuery(name = "TFamillearticle.findByStrLIBELLE", query = "SELECT t FROM TFamillearticle t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TFamillearticle.findByStrCODEFAMILLE", query = "SELECT t FROM TFamillearticle t WHERE t.strCODEFAMILLE = :strCODEFAMILLE"),
        @NamedQuery(name = "TFamillearticle.findByStrSTATUT", query = "SELECT t FROM TFamillearticle t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TFamillearticle.findByDtCREATED", query = "SELECT t FROM TFamillearticle t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFamillearticle.findByDtUPDATED", query = "SELECT t FROM TFamillearticle t WHERE t.dtUPDATED = :dtUPDATED") })
public class TFamillearticle implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLEARTICLE_ID", nullable = false, length = 40)
    private String lgFAMILLEARTICLEID;
    @Column(name = "str_LIBELLE", length = 50)
    private String strLIBELLE;
    @Column(name = "str_CODE_FAMILLE", length = 40)
    private String strCODEFAMILLE;
    @Lob
    @Column(name = "str_COMMENTAIRE", length = 65535)
    private String strCOMMENTAIRE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_GROUPE_FAMILLE_ID", referencedColumnName = "lg_GROUPE_FAMILLE_ID")
    @ManyToOne
    private TGroupeFamille lgGROUPEFAMILLEID;
    @OneToMany(mappedBy = "lgFAMILLEARTICLEID")
    private Collection<TFamille> tFamilleCollection;

    public TFamillearticle() {
    }

    public TFamillearticle(String lgFAMILLEARTICLEID) {
        this.lgFAMILLEARTICLEID = lgFAMILLEARTICLEID;
    }

    public String getLgFAMILLEARTICLEID() {
        return lgFAMILLEARTICLEID;
    }

    public void setLgFAMILLEARTICLEID(String lgFAMILLEARTICLEID) {
        this.lgFAMILLEARTICLEID = lgFAMILLEARTICLEID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public String getStrCODEFAMILLE() {
        return strCODEFAMILLE;
    }

    public void setStrCODEFAMILLE(String strCODEFAMILLE) {
        this.strCODEFAMILLE = strCODEFAMILLE;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
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

    public TGroupeFamille getLgGROUPEFAMILLEID() {
        return lgGROUPEFAMILLEID;
    }

    public void setLgGROUPEFAMILLEID(TGroupeFamille lgGROUPEFAMILLEID) {
        this.lgGROUPEFAMILLEID = lgGROUPEFAMILLEID;
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
        hash += (lgFAMILLEARTICLEID != null ? lgFAMILLEARTICLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamillearticle)) {
            return false;
        }
        TFamillearticle other = (TFamillearticle) object;
        if ((this.lgFAMILLEARTICLEID == null && other.lgFAMILLEARTICLEID != null)
                || (this.lgFAMILLEARTICLEID != null && !this.lgFAMILLEARTICLEID.equals(other.lgFAMILLEARTICLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFamillearticle[ lgFAMILLEARTICLEID=" + lgFAMILLEARTICLEID + " ]";
    }

}
