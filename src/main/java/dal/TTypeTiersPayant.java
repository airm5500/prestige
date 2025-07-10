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
@Table(name = "t_type_tiers_payant")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeTiersPayant.findAll", query = "SELECT t FROM TTypeTiersPayant t"),
        @NamedQuery(name = "TTypeTiersPayant.findByLgTYPETIERSPAYANTID", query = "SELECT t FROM TTypeTiersPayant t WHERE t.lgTYPETIERSPAYANTID = :lgTYPETIERSPAYANTID"),
        @NamedQuery(name = "TTypeTiersPayant.findByStrCODETYPETIERSPAYANT", query = "SELECT t FROM TTypeTiersPayant t WHERE t.strCODETYPETIERSPAYANT = :strCODETYPETIERSPAYANT"),
        @NamedQuery(name = "TTypeTiersPayant.findByStrLIBELLETYPETIERSPAYANT", query = "SELECT t FROM TTypeTiersPayant t WHERE t.strLIBELLETYPETIERSPAYANT = :strLIBELLETYPETIERSPAYANT"),
        @NamedQuery(name = "TTypeTiersPayant.findByDtCREATED", query = "SELECT t FROM TTypeTiersPayant t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeTiersPayant.findByDtUPDATED", query = "SELECT t FROM TTypeTiersPayant t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeTiersPayant.findByStrSTATUT", query = "SELECT t FROM TTypeTiersPayant t WHERE t.strSTATUT = :strSTATUT") })
public class TTypeTiersPayant implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_TIERS_PAYANT_ID", nullable = false, length = 40)
    private String lgTYPETIERSPAYANTID;
    @Column(name = "str_CODE_TYPE_TIERS_PAYANT", length = 40)
    private String strCODETYPETIERSPAYANT;
    @Column(name = "str_LIBELLE_TYPE_TIERS_PAYANT", length = 100)
    private String strLIBELLETYPETIERSPAYANT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgTYPETIERSPAYANTID")
    private Collection<TTiersPayant> tTiersPayantCollection;

    public TTypeTiersPayant() {
    }

    public TTypeTiersPayant(String lgTYPETIERSPAYANTID) {
        this.lgTYPETIERSPAYANTID = lgTYPETIERSPAYANTID;
    }

    public String getLgTYPETIERSPAYANTID() {
        return lgTYPETIERSPAYANTID;
    }

    public void setLgTYPETIERSPAYANTID(String lgTYPETIERSPAYANTID) {
        this.lgTYPETIERSPAYANTID = lgTYPETIERSPAYANTID;
    }

    public String getStrCODETYPETIERSPAYANT() {
        return strCODETYPETIERSPAYANT;
    }

    public void setStrCODETYPETIERSPAYANT(String strCODETYPETIERSPAYANT) {
        this.strCODETYPETIERSPAYANT = strCODETYPETIERSPAYANT;
    }

    public String getStrLIBELLETYPETIERSPAYANT() {
        return strLIBELLETYPETIERSPAYANT;
    }

    public void setStrLIBELLETYPETIERSPAYANT(String strLIBELLETYPETIERSPAYANT) {
        this.strLIBELLETYPETIERSPAYANT = strLIBELLETYPETIERSPAYANT;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    @XmlTransient
    public Collection<TTiersPayant> getTTiersPayantCollection() {
        return tTiersPayantCollection;
    }

    public void setTTiersPayantCollection(Collection<TTiersPayant> tTiersPayantCollection) {
        this.tTiersPayantCollection = tTiersPayantCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPETIERSPAYANTID != null ? lgTYPETIERSPAYANTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeTiersPayant)) {
            return false;
        }
        TTypeTiersPayant other = (TTypeTiersPayant) object;
        if ((this.lgTYPETIERSPAYANTID == null && other.lgTYPETIERSPAYANTID != null)
                || (this.lgTYPETIERSPAYANTID != null && !this.lgTYPETIERSPAYANTID.equals(other.lgTYPETIERSPAYANTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeTiersPayant[ lgTYPETIERSPAYANTID=" + lgTYPETIERSPAYANTID + " ]";
    }

}
