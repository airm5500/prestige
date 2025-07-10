/*
  * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.CategorieTypeMvt;
import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author DICI
 */
@Entity
@Table(name = "typemvtproduit")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "Typemvtproduit.findAll", query = "SELECT t FROM Typemvtproduit t"),
        @NamedQuery(name = "Typemvtproduit.findById", query = "SELECT t FROM Typemvtproduit t WHERE t.id = :id"),
        @NamedQuery(name = "Typemvtproduit.findByCategorie", query = "SELECT t FROM Typemvtproduit t WHERE t.categorieTypeMvt = :categorie") })
public class Typemvtproduit implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ID")
    private String id;
    @Basic(optional = false)
    @Column(name = "description", length = 255, nullable = false)
    private String description;
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "categorie", nullable = false)
    private CategorieTypeMvt categorieTypeMvt;

    public Typemvtproduit() {
    }

    public Typemvtproduit(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public CategorieTypeMvt getCategorieTypeMvt() {
        return categorieTypeMvt;
    }

    public void setCategorieTypeMvt(CategorieTypeMvt categorieTypeMvt) {
        this.categorieTypeMvt = categorieTypeMvt;
    }

    public Typemvtproduit(String id, String description, CategorieTypeMvt typeMvt) {
        this.id = id;
        this.description = description;
        this.categorieTypeMvt = typeMvt;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (id != null ? id.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof Typemvtproduit)) {
            return false;
        }
        Typemvtproduit other = (Typemvtproduit) object;
        if ((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.Typemvtproduit[ id=" + id + " ]";
    }

}
