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
@Table(name = "t_escompte_societe_tranche")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TEscompteSocieteTranche.findAll", query = "SELECT t FROM TEscompteSocieteTranche t"),
        @NamedQuery(name = "TEscompteSocieteTranche.findByLgESCOMPTESOCIETETRANCHEID", query = "SELECT t FROM TEscompteSocieteTranche t WHERE t.lgESCOMPTESOCIETETRANCHEID = :lgESCOMPTESOCIETETRANCHEID"),
        @NamedQuery(name = "TEscompteSocieteTranche.findByStrSTATUT", query = "SELECT t FROM TEscompteSocieteTranche t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TEscompteSocieteTranche.findByDtCREATED", query = "SELECT t FROM TEscompteSocieteTranche t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TEscompteSocieteTranche.findByDtUPDATED", query = "SELECT t FROM TEscompteSocieteTranche t WHERE t.dtUPDATED = :dtUPDATED") })
public class TEscompteSocieteTranche implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ESCOMPTE_SOCIETE_TRANCHE_ID", nullable = false, length = 40)
    private String lgESCOMPTESOCIETETRANCHEID;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_TRANCHE_ID", referencedColumnName = "lg_TRANCHE_ID")
    @ManyToOne
    private TTranche lgTRANCHEID;
    @JoinColumn(name = "lg_ESCOMPTE_SOCIETE_ID", referencedColumnName = "lg_ESCOMPTE_SOCIETE_ID")
    @ManyToOne
    private TEscompteSociete lgESCOMPTESOCIETEID;

    public TEscompteSocieteTranche() {
    }

    public TEscompteSocieteTranche(String lgESCOMPTESOCIETETRANCHEID) {
        this.lgESCOMPTESOCIETETRANCHEID = lgESCOMPTESOCIETETRANCHEID;
    }

    public String getLgESCOMPTESOCIETETRANCHEID() {
        return lgESCOMPTESOCIETETRANCHEID;
    }

    public void setLgESCOMPTESOCIETETRANCHEID(String lgESCOMPTESOCIETETRANCHEID) {
        this.lgESCOMPTESOCIETETRANCHEID = lgESCOMPTESOCIETETRANCHEID;
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

    public TTranche getLgTRANCHEID() {
        return lgTRANCHEID;
    }

    public void setLgTRANCHEID(TTranche lgTRANCHEID) {
        this.lgTRANCHEID = lgTRANCHEID;
    }

    public TEscompteSociete getLgESCOMPTESOCIETEID() {
        return lgESCOMPTESOCIETEID;
    }

    public void setLgESCOMPTESOCIETEID(TEscompteSociete lgESCOMPTESOCIETEID) {
        this.lgESCOMPTESOCIETEID = lgESCOMPTESOCIETEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgESCOMPTESOCIETETRANCHEID != null ? lgESCOMPTESOCIETETRANCHEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEscompteSocieteTranche)) {
            return false;
        }
        TEscompteSocieteTranche other = (TEscompteSocieteTranche) object;
        if ((this.lgESCOMPTESOCIETETRANCHEID == null && other.lgESCOMPTESOCIETETRANCHEID != null)
                || (this.lgESCOMPTESOCIETETRANCHEID != null
                        && !this.lgESCOMPTESOCIETETRANCHEID.equals(other.lgESCOMPTESOCIETETRANCHEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEscompteSocieteTranche[ lgESCOMPTESOCIETETRANCHEID=" + lgESCOMPTESOCIETETRANCHEID + " ]";
    }

}
