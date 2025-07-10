/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Collection;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_type_depense")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeDepense.findAll", query = "SELECT t FROM TTypeDepense t"),
        @NamedQuery(name = "TTypeDepense.findByLgTYPEDEPENSEID", query = "SELECT t FROM TTypeDepense t WHERE t.lgTYPEDEPENSEID = :lgTYPEDEPENSEID"),
        @NamedQuery(name = "TTypeDepense.findByStrTYPEDEPENSE", query = "SELECT t FROM TTypeDepense t WHERE t.strTYPEDEPENSE = :strTYPEDEPENSE"),
        @NamedQuery(name = "TTypeDepense.findByStrNUMEROCOMPTE", query = "SELECT t FROM TTypeDepense t WHERE t.strNUMEROCOMPTE = :strNUMEROCOMPTE"),
        @NamedQuery(name = "TTypeDepense.findByIsUSETVA", query = "SELECT t FROM TTypeDepense t WHERE t.isUSETVA = :isUSETVA") })
public class TTypeDepense implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_DEPENSE_ID", nullable = false, length = 40)
    private String lgTYPEDEPENSEID;
    @Column(name = "str_TYPE_DEPENSE", length = 40)
    private String strTYPEDEPENSE;
    @Column(name = "str_NUMERO_COMPTE", length = 20)
    private String strNUMEROCOMPTE;
    @Column(name = "is_USE_TVA")
    private Boolean isUSETVA;
    @OneToMany(mappedBy = "lgTYPEDEPENSEID")
    private Collection<TDepenses> tDepensesCollection;

    public TTypeDepense() {
    }

    public TTypeDepense(String lgTYPEDEPENSEID) {
        this.lgTYPEDEPENSEID = lgTYPEDEPENSEID;
    }

    public String getLgTYPEDEPENSEID() {
        return lgTYPEDEPENSEID;
    }

    public void setLgTYPEDEPENSEID(String lgTYPEDEPENSEID) {
        this.lgTYPEDEPENSEID = lgTYPEDEPENSEID;
    }

    public String getStrTYPEDEPENSE() {
        return strTYPEDEPENSE;
    }

    public void setStrTYPEDEPENSE(String strTYPEDEPENSE) {
        this.strTYPEDEPENSE = strTYPEDEPENSE;
    }

    public String getStrNUMEROCOMPTE() {
        return strNUMEROCOMPTE;
    }

    public void setStrNUMEROCOMPTE(String strNUMEROCOMPTE) {
        this.strNUMEROCOMPTE = strNUMEROCOMPTE;
    }

    public Boolean getIsUSETVA() {
        return isUSETVA;
    }

    public void setIsUSETVA(Boolean isUSETVA) {
        this.isUSETVA = isUSETVA;
    }

    @XmlTransient
    public Collection<TDepenses> getTDepensesCollection() {
        return tDepensesCollection;
    }

    public void setTDepensesCollection(Collection<TDepenses> tDepensesCollection) {
        this.tDepensesCollection = tDepensesCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEDEPENSEID != null ? lgTYPEDEPENSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeDepense)) {
            return false;
        }
        TTypeDepense other = (TTypeDepense) object;
        if ((this.lgTYPEDEPENSEID == null && other.lgTYPEDEPENSEID != null)
                || (this.lgTYPEDEPENSEID != null && !this.lgTYPEDEPENSEID.equals(other.lgTYPEDEPENSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeDepense[ lgTYPEDEPENSEID=" + lgTYPEDEPENSEID + " ]";
    }

}
