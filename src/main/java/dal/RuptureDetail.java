/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

/**
 *
 *
 */
@Entity
@Table(name = "rupture_detail")
public class RuptureDetail implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 40)
    private String id = UUID.randomUUID().toString();
    @Column(name = "qty")
    private Integer qty = 0;
    @JoinColumn(name = "produitId", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille produit;
    @JoinColumn(name = "ruptureId", referencedColumnName = "id")
    @ManyToOne
    private Rupture rupture;
    @Column(name = "prixAchat")
    private Integer prixAchat = 0;
    @Column(name = "prixVente")
    private Integer prixVente = 0;

    public RuptureDetail() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    public TFamille getProduit() {
        return produit;
    }

    public void setProduit(TFamille produit) {
        this.produit = produit;
    }

    @Override
    public String toString() {
        return "RuptureDetail{" + "id=" + id + ", qty=" + qty + ", produit=" + produit + ", rupture=" + rupture + '}';
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 13 * hash + Objects.hashCode(this.id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final RuptureDetail other = (RuptureDetail) obj;
        return Objects.equals(this.id, other.id);
    }

    public Rupture getRupture() {
        return rupture;
    }

    public void setRupture(Rupture rupture) {
        this.rupture = rupture;
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public Integer getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(Integer prixVente) {
        this.prixVente = prixVente;
    }

}
