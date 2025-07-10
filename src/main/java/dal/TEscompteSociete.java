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
@Table(name = "t_escompte_societe")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TEscompteSociete.findAll", query = "SELECT t FROM TEscompteSociete t"),
        @NamedQuery(name = "TEscompteSociete.findByLgESCOMPTESOCIETEID", query = "SELECT t FROM TEscompteSociete t WHERE t.lgESCOMPTESOCIETEID = :lgESCOMPTESOCIETEID"),
        @NamedQuery(name = "TEscompteSociete.findByIntCODEESCOMPTESOCIETE", query = "SELECT t FROM TEscompteSociete t WHERE t.intCODEESCOMPTESOCIETE = :intCODEESCOMPTESOCIETE"),
        @NamedQuery(name = "TEscompteSociete.findByStrLIBELLEESCOMPTESOCIETE", query = "SELECT t FROM TEscompteSociete t WHERE t.strLIBELLEESCOMPTESOCIETE = :strLIBELLEESCOMPTESOCIETE"),
        @NamedQuery(name = "TEscompteSociete.findByStrSTATUT", query = "SELECT t FROM TEscompteSociete t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TEscompteSociete.findByDtCREATED", query = "SELECT t FROM TEscompteSociete t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TEscompteSociete.findByDtUPDATED", query = "SELECT t FROM TEscompteSociete t WHERE t.dtUPDATED = :dtUPDATED") })
public class TEscompteSociete implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ESCOMPTE_SOCIETE_ID", nullable = false, length = 40)
    private String lgESCOMPTESOCIETEID;
    @Column(name = "int_CODE_ESCOMPTE_SOCIETE")
    private Integer intCODEESCOMPTESOCIETE;
    @Column(name = "str_LIBELLE_ESCOMPTE_SOCIETE", length = 50)
    private String strLIBELLEESCOMPTESOCIETE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgESCOMPTESOCIETEID")
    private Collection<TEscompteSocieteTranche> tEscompteSocieteTrancheCollection;
    @OneToMany(mappedBy = "lgESCOMPTESOCIETEID")
    private Collection<TFicheSociete> tFicheSocieteCollection;

    public TEscompteSociete() {
    }

    public TEscompteSociete(String lgESCOMPTESOCIETEID) {
        this.lgESCOMPTESOCIETEID = lgESCOMPTESOCIETEID;
    }

    public String getLgESCOMPTESOCIETEID() {
        return lgESCOMPTESOCIETEID;
    }

    public void setLgESCOMPTESOCIETEID(String lgESCOMPTESOCIETEID) {
        this.lgESCOMPTESOCIETEID = lgESCOMPTESOCIETEID;
    }

    public Integer getIntCODEESCOMPTESOCIETE() {
        return intCODEESCOMPTESOCIETE;
    }

    public void setIntCODEESCOMPTESOCIETE(Integer intCODEESCOMPTESOCIETE) {
        this.intCODEESCOMPTESOCIETE = intCODEESCOMPTESOCIETE;
    }

    public String getStrLIBELLEESCOMPTESOCIETE() {
        return strLIBELLEESCOMPTESOCIETE;
    }

    public void setStrLIBELLEESCOMPTESOCIETE(String strLIBELLEESCOMPTESOCIETE) {
        this.strLIBELLEESCOMPTESOCIETE = strLIBELLEESCOMPTESOCIETE;
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
    public Collection<TEscompteSocieteTranche> getTEscompteSocieteTrancheCollection() {
        return tEscompteSocieteTrancheCollection;
    }

    public void setTEscompteSocieteTrancheCollection(
            Collection<TEscompteSocieteTranche> tEscompteSocieteTrancheCollection) {
        this.tEscompteSocieteTrancheCollection = tEscompteSocieteTrancheCollection;
    }

    @XmlTransient
    public Collection<TFicheSociete> getTFicheSocieteCollection() {
        return tFicheSocieteCollection;
    }

    public void setTFicheSocieteCollection(Collection<TFicheSociete> tFicheSocieteCollection) {
        this.tFicheSocieteCollection = tFicheSocieteCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgESCOMPTESOCIETEID != null ? lgESCOMPTESOCIETEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEscompteSociete)) {
            return false;
        }
        TEscompteSociete other = (TEscompteSociete) object;
        if ((this.lgESCOMPTESOCIETEID == null && other.lgESCOMPTESOCIETEID != null)
                || (this.lgESCOMPTESOCIETEID != null && !this.lgESCOMPTESOCIETEID.equals(other.lgESCOMPTESOCIETEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEscompteSociete[ lgESCOMPTESOCIETEID=" + lgESCOMPTESOCIETEID + " ]";
    }

}
