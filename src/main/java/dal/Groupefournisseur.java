/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author Kobena
 */
@Entity
@Table(name = "groupefournisseur")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "Groupefournisseur.findAll", query = "SELECT g FROM Groupefournisseur g") })
public class Groupefournisseur implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Basic(optional = false)
    @Column(name = "id")
    private Integer id;
    @Basic(optional = false)
    @Column(name = "libelle")
    private String libelle;

    public Groupefournisseur() {
    }

    public Groupefournisseur(Integer id) {
        this.id = id;
    }

    public Groupefournisseur(Integer id, String libelle) {
        this.id = id;
        this.libelle = libelle;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
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
        if (!(object instanceof Groupefournisseur)) {
            return false;
        }
        Groupefournisseur other = (Groupefournisseur) object;
        if ((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.Groupefournisseur[ id=" + id + " ]";
    }

    // @XmlTransient
    // @JsonIgnore
    // public Set<TGrossiste> gettGrossisteCollection() {
    // return tGrossisteCollection;
    // }
    //
    // public void settGrossisteCollection(Set<TGrossiste> tGrossisteCollection) {
    // this.tGrossisteCollection = tGrossisteCollection;
    // }

}
