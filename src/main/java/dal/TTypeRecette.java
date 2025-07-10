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
@Table(name = "t_type_recette")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeRecette.findAll", query = "SELECT t FROM TTypeRecette t"),
        @NamedQuery(name = "TTypeRecette.findByLgTYPERECETTEID", query = "SELECT t FROM TTypeRecette t WHERE t.lgTYPERECETTEID = :lgTYPERECETTEID"),
        @NamedQuery(name = "TTypeRecette.findByStrTYPERECETTE", query = "SELECT t FROM TTypeRecette t WHERE t.strTYPERECETTE = :strTYPERECETTE"),
        @NamedQuery(name = "TTypeRecette.findByStrNUMEROCOMPTE", query = "SELECT t FROM TTypeRecette t WHERE t.strNUMEROCOMPTE = :strNUMEROCOMPTE"),
        @NamedQuery(name = "TTypeRecette.findByIsUSETVA", query = "SELECT t FROM TTypeRecette t WHERE t.isUSETVA = :isUSETVA") })
public class TTypeRecette implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_RECETTE_ID", nullable = false, length = 40)
    private String lgTYPERECETTEID;
    @Column(name = "str_TYPE_RECETTE", length = 40)
    private String strTYPERECETTE;
    @Column(name = "str_NUMERO_COMPTE", length = 20)
    private String strNUMEROCOMPTE;
    @Column(name = "is_USE_TVA")
    private Boolean isUSETVA;
    @OneToMany(mappedBy = "lgTYPERECETTEID")
    private Collection<TSnapShopDalyRecette> tSnapShopDalyRecetteCollection;
    @OneToMany(mappedBy = "lgTYPERECETTEID")
    private Collection<TSnapShopDalyRecetteCaisse> tSnapShopDalyRecetteCaisseCollection;
    @OneToMany(mappedBy = "lgTYPERECETTEID")
    private Collection<TRecettes> tRecettesCollection;

    public TTypeRecette() {
    }

    public TTypeRecette(String lgTYPERECETTEID) {
        this.lgTYPERECETTEID = lgTYPERECETTEID;
    }

    public String getLgTYPERECETTEID() {
        return lgTYPERECETTEID;
    }

    public void setLgTYPERECETTEID(String lgTYPERECETTEID) {
        this.lgTYPERECETTEID = lgTYPERECETTEID;
    }

    public String getStrTYPERECETTE() {
        return strTYPERECETTE;
    }

    public void setStrTYPERECETTE(String strTYPERECETTE) {
        this.strTYPERECETTE = strTYPERECETTE;
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
    public Collection<TSnapShopDalyRecette> getTSnapShopDalyRecetteCollection() {
        return tSnapShopDalyRecetteCollection;
    }

    public void setTSnapShopDalyRecetteCollection(Collection<TSnapShopDalyRecette> tSnapShopDalyRecetteCollection) {
        this.tSnapShopDalyRecetteCollection = tSnapShopDalyRecetteCollection;
    }

    @XmlTransient
    public Collection<TSnapShopDalyRecetteCaisse> getTSnapShopDalyRecetteCaisseCollection() {
        return tSnapShopDalyRecetteCaisseCollection;
    }

    public void setTSnapShopDalyRecetteCaisseCollection(
            Collection<TSnapShopDalyRecetteCaisse> tSnapShopDalyRecetteCaisseCollection) {
        this.tSnapShopDalyRecetteCaisseCollection = tSnapShopDalyRecetteCaisseCollection;
    }

    @XmlTransient
    public Collection<TRecettes> getTRecettesCollection() {
        return tRecettesCollection;
    }

    public void setTRecettesCollection(Collection<TRecettes> tRecettesCollection) {
        this.tRecettesCollection = tRecettesCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPERECETTEID != null ? lgTYPERECETTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeRecette)) {
            return false;
        }
        TTypeRecette other = (TTypeRecette) object;
        if ((this.lgTYPERECETTEID == null && other.lgTYPERECETTEID != null)
                || (this.lgTYPERECETTEID != null && !this.lgTYPERECETTEID.equals(other.lgTYPERECETTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeRecette[ lgTYPERECETTEID=" + lgTYPERECETTEID + " ]";
    }

}
