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
@Table(name = "t_specialite")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSpecialite.findAll", query = "SELECT t FROM TSpecialite t"),
        @NamedQuery(name = "TSpecialite.findByLgSPECIALITEID", query = "SELECT t FROM TSpecialite t WHERE t.lgSPECIALITEID = :lgSPECIALITEID"),
        @NamedQuery(name = "TSpecialite.findByStrCODESPECIALITE", query = "SELECT t FROM TSpecialite t WHERE t.strCODESPECIALITE = :strCODESPECIALITE"),
        @NamedQuery(name = "TSpecialite.findByStrLIBELLESPECIALITE", query = "SELECT t FROM TSpecialite t WHERE t.strLIBELLESPECIALITE = :strLIBELLESPECIALITE"),
        @NamedQuery(name = "TSpecialite.findByStrSTATUT", query = "SELECT t FROM TSpecialite t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSpecialite.findByDtCREATED", query = "SELECT t FROM TSpecialite t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSpecialite.findByDtUPDATED", query = "SELECT t FROM TSpecialite t WHERE t.dtUPDATED = :dtUPDATED") })
public class TSpecialite implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SPECIALITE_ID", nullable = false, length = 40)
    private String lgSPECIALITEID;
    @Column(name = "str_CODESPECIALITE", length = 40)
    private String strCODESPECIALITE;
    @Column(name = "str_LIBELLESPECIALITE", length = 40)
    private String strLIBELLESPECIALITE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgSPECIALITEID")
    private Collection<TMedecinSpecialite> tMedecinSpecialiteCollection;
    @OneToMany(mappedBy = "lgSPECIALITEID")
    private Collection<TMedecin> tMedecinCollection;

    public TSpecialite() {
    }

    public TSpecialite(String lgSPECIALITEID) {
        this.lgSPECIALITEID = lgSPECIALITEID;
    }

    public String getLgSPECIALITEID() {
        return lgSPECIALITEID;
    }

    public void setLgSPECIALITEID(String lgSPECIALITEID) {
        this.lgSPECIALITEID = lgSPECIALITEID;
    }

    public String getStrCODESPECIALITE() {
        return strCODESPECIALITE;
    }

    public void setStrCODESPECIALITE(String strCODESPECIALITE) {
        this.strCODESPECIALITE = strCODESPECIALITE;
    }

    public String getStrLIBELLESPECIALITE() {
        return strLIBELLESPECIALITE;
    }

    public void setStrLIBELLESPECIALITE(String strLIBELLESPECIALITE) {
        this.strLIBELLESPECIALITE = strLIBELLESPECIALITE;
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
    public Collection<TMedecinSpecialite> getTMedecinSpecialiteCollection() {
        return tMedecinSpecialiteCollection;
    }

    public void setTMedecinSpecialiteCollection(Collection<TMedecinSpecialite> tMedecinSpecialiteCollection) {
        this.tMedecinSpecialiteCollection = tMedecinSpecialiteCollection;
    }

    @XmlTransient
    public Collection<TMedecin> getTMedecinCollection() {
        return tMedecinCollection;
    }

    public void setTMedecinCollection(Collection<TMedecin> tMedecinCollection) {
        this.tMedecinCollection = tMedecinCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSPECIALITEID != null ? lgSPECIALITEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSpecialite)) {
            return false;
        }
        TSpecialite other = (TSpecialite) object;
        if ((this.lgSPECIALITEID == null && other.lgSPECIALITEID != null)
                || (this.lgSPECIALITEID != null && !this.lgSPECIALITEID.equals(other.lgSPECIALITEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSpecialite[ lgSPECIALITEID=" + lgSPECIALITEID + " ]";
    }

}
