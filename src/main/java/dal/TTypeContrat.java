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
@Table(name = "t_type_contrat")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeContrat.findAll", query = "SELECT t FROM TTypeContrat t"),
        @NamedQuery(name = "TTypeContrat.findByLgTYPECONTRATID", query = "SELECT t FROM TTypeContrat t WHERE t.lgTYPECONTRATID = :lgTYPECONTRATID"),
        @NamedQuery(name = "TTypeContrat.findByStrCODETYPECONTRAT", query = "SELECT t FROM TTypeContrat t WHERE t.strCODETYPECONTRAT = :strCODETYPECONTRAT"),
        @NamedQuery(name = "TTypeContrat.findByStrLIBELLETYPECONTRAT", query = "SELECT t FROM TTypeContrat t WHERE t.strLIBELLETYPECONTRAT = :strLIBELLETYPECONTRAT"),
        @NamedQuery(name = "TTypeContrat.findByDtCREATED", query = "SELECT t FROM TTypeContrat t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeContrat.findByDtUPDATED", query = "SELECT t FROM TTypeContrat t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeContrat.findByStrSTATUT", query = "SELECT t FROM TTypeContrat t WHERE t.strSTATUT = :strSTATUT") })
public class TTypeContrat implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_CONTRAT_ID", nullable = false, length = 40)
    private String lgTYPECONTRATID;
    @Column(name = "str_CODE_TYPE_CONTRAT", length = 40)
    private String strCODETYPECONTRAT;
    @Column(name = "str_LIBELLE_TYPE_CONTRAT", length = 100)
    private String strLIBELLETYPECONTRAT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgTYPECONTRATID")
    private Collection<TTiersPayant> tTiersPayantCollection;

    public TTypeContrat() {
    }

    public TTypeContrat(String lgTYPECONTRATID) {
        this.lgTYPECONTRATID = lgTYPECONTRATID;
    }

    public String getLgTYPECONTRATID() {
        return lgTYPECONTRATID;
    }

    public void setLgTYPECONTRATID(String lgTYPECONTRATID) {
        this.lgTYPECONTRATID = lgTYPECONTRATID;
    }

    public String getStrCODETYPECONTRAT() {
        return strCODETYPECONTRAT;
    }

    public void setStrCODETYPECONTRAT(String strCODETYPECONTRAT) {
        this.strCODETYPECONTRAT = strCODETYPECONTRAT;
    }

    public String getStrLIBELLETYPECONTRAT() {
        return strLIBELLETYPECONTRAT;
    }

    public void setStrLIBELLETYPECONTRAT(String strLIBELLETYPECONTRAT) {
        this.strLIBELLETYPECONTRAT = strLIBELLETYPECONTRAT;
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
        hash += (lgTYPECONTRATID != null ? lgTYPECONTRATID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeContrat)) {
            return false;
        }
        TTypeContrat other = (TTypeContrat) object;
        if ((this.lgTYPECONTRATID == null && other.lgTYPECONTRATID != null)
                || (this.lgTYPECONTRATID != null && !this.lgTYPECONTRATID.equals(other.lgTYPECONTRATID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeContrat[ lgTYPECONTRATID=" + lgTYPECONTRATID + " ]";
    }

}
