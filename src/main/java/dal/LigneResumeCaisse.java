/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.TypeLigneResume;
import java.io.Serializable;
import java.util.Objects;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "ligne_resume_caisse", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "type_reglement_id", "resume_caisse_id", "type_ligne" }) })
public class LigneResumeCaisse implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Basic(optional = false)
    @Column(name = "id")
    private Long id;
    @NotNull
    @Column(name = "montant", nullable = false)
    private long montant;
    @NotNull
    @JoinColumn(name = "type_reglement_id", referencedColumnName = "lg_TYPE_REGLEMENT_ID", nullable = false)
    @ManyToOne
    private TTypeReglement typeReglement;
    @NotNull
    @JoinColumn(name = "resume_caisse_id", referencedColumnName = "ld_CAISSE_ID", nullable = false)
    @ManyToOne
    private TResumeCaisse resumeCaisse;
    @NotNull
    @Column(name = "type_ligne")
    @Enumerated(EnumType.ORDINAL)
    private TypeLigneResume typeLigne;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public TTypeReglement getTypeReglement() {
        return typeReglement;
    }

    public void setTypeReglement(TTypeReglement typeReglement) {
        this.typeReglement = typeReglement;
    }

    public TResumeCaisse getResumeCaisse() {
        return resumeCaisse;
    }

    public void setResumeCaisse(TResumeCaisse resumeCaisse) {
        this.resumeCaisse = resumeCaisse;
    }

    public TypeLigneResume getTypeLigne() {
        return typeLigne;
    }

    public void setTypeLigne(TypeLigneResume typeLigne) {
        this.typeLigne = typeLigne;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 17 * hash + Objects.hashCode(this.id);
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
        final LigneResumeCaisse other = (LigneResumeCaisse) obj;
        return Objects.equals(this.id, other.id);
    }

}
