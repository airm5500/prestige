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
@Table(name = "t_type_facture")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeFacture.findAll", query = "SELECT t FROM TTypeFacture t"),
        @NamedQuery(name = "TTypeFacture.findByLgTYPEFACTUREID", query = "SELECT t FROM TTypeFacture t WHERE t.lgTYPEFACTUREID = :lgTYPEFACTUREID"),
        @NamedQuery(name = "TTypeFacture.findByStrLIBELLE", query = "SELECT t FROM TTypeFacture t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TTypeFacture.findByStrSTATUT", query = "SELECT t FROM TTypeFacture t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeFacture.findByDtCREATED", query = "SELECT t FROM TTypeFacture t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeFacture.findByDtUPDATED", query = "SELECT t FROM TTypeFacture t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypeFacture implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_FACTURE_ID", nullable = false, length = 40)
    private String lgTYPEFACTUREID;
    @Column(name = "str_LIBELLE", length = 100)
    private String strLIBELLE;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgTYPEFACTUREID")
    private Collection<TFacture> tFactureCollection;

    public TTypeFacture() {
    }

    public TTypeFacture(String lgTYPEFACTUREID) {
        this.lgTYPEFACTUREID = lgTYPEFACTUREID;
    }

    public String getLgTYPEFACTUREID() {
        return lgTYPEFACTUREID;
    }

    public void setLgTYPEFACTUREID(String lgTYPEFACTUREID) {
        this.lgTYPEFACTUREID = lgTYPEFACTUREID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
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
    public Collection<TFacture> getTFactureCollection() {
        return tFactureCollection;
    }

    public void setTFactureCollection(Collection<TFacture> tFactureCollection) {
        this.tFactureCollection = tFactureCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEFACTUREID != null ? lgTYPEFACTUREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeFacture)) {
            return false;
        }
        TTypeFacture other = (TTypeFacture) object;
        if ((this.lgTYPEFACTUREID == null && other.lgTYPEFACTUREID != null)
                || (this.lgTYPEFACTUREID != null && !this.lgTYPEFACTUREID.equals(other.lgTYPEFACTUREID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeFacture[ lgTYPEFACTUREID=" + lgTYPEFACTUREID + " ]";
    }

}
