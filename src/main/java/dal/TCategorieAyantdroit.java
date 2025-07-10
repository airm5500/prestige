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
@Table(name = "t_categorie_ayantdroit")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCategorieAyantdroit.findAll", query = "SELECT t FROM TCategorieAyantdroit t"),
        @NamedQuery(name = "TCategorieAyantdroit.findByLgCATEGORIEAYANTDROITID", query = "SELECT t FROM TCategorieAyantdroit t WHERE t.lgCATEGORIEAYANTDROITID = :lgCATEGORIEAYANTDROITID"),
        @NamedQuery(name = "TCategorieAyantdroit.findByStrCODE", query = "SELECT t FROM TCategorieAyantdroit t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TCategorieAyantdroit.findByStrLIBELLECATEGORIEAYANTDROIT", query = "SELECT t FROM TCategorieAyantdroit t WHERE t.strLIBELLECATEGORIEAYANTDROIT = :strLIBELLECATEGORIEAYANTDROIT"),
        @NamedQuery(name = "TCategorieAyantdroit.findByStrSTATUT", query = "SELECT t FROM TCategorieAyantdroit t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TCategorieAyantdroit.findByDtCREATED", query = "SELECT t FROM TCategorieAyantdroit t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCategorieAyantdroit.findByDtUPDATED", query = "SELECT t FROM TCategorieAyantdroit t WHERE t.dtUPDATED = :dtUPDATED") })
public class TCategorieAyantdroit implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CATEGORIE_AYANTDROIT_ID", nullable = false, length = 40)
    private String lgCATEGORIEAYANTDROITID;
    @Column(name = "str_CODE", length = 10)
    private String strCODE;
    @Column(name = "str_LIBELLE_CATEGORIE_AYANTDROIT", length = 100)
    private String strLIBELLECATEGORIEAYANTDROIT;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgCATEGORIEAYANTDROITID")
    private Collection<TAyantDroit> tAyantDroitCollection;

    public TCategorieAyantdroit() {
    }

    public TCategorieAyantdroit(String lgCATEGORIEAYANTDROITID) {
        this.lgCATEGORIEAYANTDROITID = lgCATEGORIEAYANTDROITID;
    }

    public String getLgCATEGORIEAYANTDROITID() {
        return lgCATEGORIEAYANTDROITID;
    }

    public void setLgCATEGORIEAYANTDROITID(String lgCATEGORIEAYANTDROITID) {
        this.lgCATEGORIEAYANTDROITID = lgCATEGORIEAYANTDROITID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrLIBELLECATEGORIEAYANTDROIT() {
        return strLIBELLECATEGORIEAYANTDROIT;
    }

    public void setStrLIBELLECATEGORIEAYANTDROIT(String strLIBELLECATEGORIEAYANTDROIT) {
        this.strLIBELLECATEGORIEAYANTDROIT = strLIBELLECATEGORIEAYANTDROIT;
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
    public Collection<TAyantDroit> getTAyantDroitCollection() {
        return tAyantDroitCollection;
    }

    public void setTAyantDroitCollection(Collection<TAyantDroit> tAyantDroitCollection) {
        this.tAyantDroitCollection = tAyantDroitCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCATEGORIEAYANTDROITID != null ? lgCATEGORIEAYANTDROITID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCategorieAyantdroit)) {
            return false;
        }
        TCategorieAyantdroit other = (TCategorieAyantdroit) object;
        if ((this.lgCATEGORIEAYANTDROITID == null && other.lgCATEGORIEAYANTDROITID != null)
                || (this.lgCATEGORIEAYANTDROITID != null
                        && !this.lgCATEGORIEAYANTDROITID.equals(other.lgCATEGORIEAYANTDROITID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCategorieAyantdroit[ lgCATEGORIEAYANTDROITID=" + lgCATEGORIEAYANTDROITID + " ]";
    }

}
