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
import javax.persistence.Lob;
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
@Table(name = "t_groupe_famille", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_GROUPE_FAMILLE_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TGroupeFamille.findAll", query = "SELECT t FROM TGroupeFamille t"),
        @NamedQuery(name = "TGroupeFamille.findByLgGROUPEFAMILLEID", query = "SELECT t FROM TGroupeFamille t WHERE t.lgGROUPEFAMILLEID = :lgGROUPEFAMILLEID"),
        @NamedQuery(name = "TGroupeFamille.findByStrLIBELLE", query = "SELECT t FROM TGroupeFamille t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TGroupeFamille.findByStrSTATUT", query = "SELECT t FROM TGroupeFamille t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TGroupeFamille.findByDtCREATED", query = "SELECT t FROM TGroupeFamille t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TGroupeFamille.findByDtUPDATED", query = "SELECT t FROM TGroupeFamille t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TGroupeFamille.findByStrCODEGROUPEFAMILLE", query = "SELECT t FROM TGroupeFamille t WHERE t.strCODEGROUPEFAMILLE = :strCODEGROUPEFAMILLE") })
public class TGroupeFamille implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_GROUPE_FAMILLE_ID", nullable = false, length = 40)
    private String lgGROUPEFAMILLEID;
    @Column(name = "str_LIBELLE", length = 80)
    private String strLIBELLE;
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
    @Column(name = "str_CODE_GROUPE_FAMILLE", length = 40)
    private String strCODEGROUPEFAMILLE;
    @OneToMany(mappedBy = "lgGROUPEFAMILLEID")
    private Collection<TFamillearticle> tFamillearticleCollection;

    public TGroupeFamille() {
    }

    public TGroupeFamille(String lgGROUPEFAMILLEID) {
        this.lgGROUPEFAMILLEID = lgGROUPEFAMILLEID;
    }

    public String getLgGROUPEFAMILLEID() {
        return lgGROUPEFAMILLEID;
    }

    public void setLgGROUPEFAMILLEID(String lgGROUPEFAMILLEID) {
        this.lgGROUPEFAMILLEID = lgGROUPEFAMILLEID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
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

    public String getStrCODEGROUPEFAMILLE() {
        return strCODEGROUPEFAMILLE;
    }

    public void setStrCODEGROUPEFAMILLE(String strCODEGROUPEFAMILLE) {
        this.strCODEGROUPEFAMILLE = strCODEGROUPEFAMILLE;
    }

    @XmlTransient
    public Collection<TFamillearticle> getTFamillearticleCollection() {
        return tFamillearticleCollection;
    }

    public void setTFamillearticleCollection(Collection<TFamillearticle> tFamillearticleCollection) {
        this.tFamillearticleCollection = tFamillearticleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgGROUPEFAMILLEID != null ? lgGROUPEFAMILLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TGroupeFamille)) {
            return false;
        }
        TGroupeFamille other = (TGroupeFamille) object;
        if ((this.lgGROUPEFAMILLEID == null && other.lgGROUPEFAMILLEID != null)
                || (this.lgGROUPEFAMILLEID != null && !this.lgGROUPEFAMILLEID.equals(other.lgGROUPEFAMILLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TGroupeFamille[ lgGROUPEFAMILLEID=" + lgGROUPEFAMILLEID + " ]";
    }

}
