/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.TypeReglementCarnet;
import dal.enumeration.TypeTiersPayant;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "reglement_carnet", indexes = {
        @Index(name = "reglement_carnet_type_tiers_payant", columnList = "type_tiers_payant")

})
public class ReglementCarnet implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 11)
    private Integer id;
    @Column(name = "description")
    private String description;
    @NotNull
    @Column(name = "montant_paye", nullable = false, length = 11)
    private Integer montantPaye;

    @NotNull
    @Column(name = "montant_a_payer", nullable = false, length = 11)
    private Integer montantPayer;
    @NotNull
    @Column(name = "montant_restant", nullable = false, length = 11)
    private Integer montantRestant;
    @NotNull
    @JoinColumn(name = "user_id", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser user;

    @NotNull
    @JoinColumn(name = "tierspayant_id", referencedColumnName = "lg_TIERS_PAYANT_ID", nullable = false)
    @ManyToOne
    private TTiersPayant tiersPayant;
    @Column(name = "createdAt", nullable = false)
    private LocalDateTime createdAt;
    @NotNull
    @Column(name = "reference", nullable = false)
    private Integer reference = 0;
    @JoinColumn(name = "type_reglement_id", referencedColumnName = "lg_TYPE_REGLEMENT_ID", nullable = false)
    @ManyToOne
    private TTypeReglement typeReglement;
    @Column(name = "id_dossier", length = 50)
    private String idDossier;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type_tiers_payant", nullable = false, length = 30)
    private TypeTiersPayant typeTiersPayant = TypeTiersPayant.CARNET_AS_DEPOT;
    @ManyToOne
    private MotifReglement motifReglement;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_reglement", length = 30)
    private TypeReglementCarnet typeReglementCarnet = TypeReglementCarnet.REGLEMENT;

    public MotifReglement getMotifReglement() {
        return motifReglement;
    }

    public TypeReglementCarnet getTypeReglementCarnet() {
        return typeReglementCarnet;
    }

    public void setTypeReglementCarnet(TypeReglementCarnet typeReglementCarnet) {
        this.typeReglementCarnet = typeReglementCarnet;
    }

    public void setMotifReglement(MotifReglement motifReglement) {
        this.motifReglement = motifReglement;
    }

    public String getIdDossier() {
        return idDossier;
    }

    public void setIdDossier(String idDossier) {
        this.idDossier = idDossier;
    }

    public TypeTiersPayant getTypeTiersPayant() {
        return typeTiersPayant;
    }

    public void setTypeTiersPayant(TypeTiersPayant typeTiersPayant) {
        this.typeTiersPayant = typeTiersPayant;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public TTypeReglement getTypeReglement() {
        return typeReglement;
    }

    public void setTypeReglement(TTypeReglement typeReglement) {
        this.typeReglement = typeReglement;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public Integer getMontantPayer() {
        return montantPayer;
    }

    public void setMontantPayer(Integer montantPayer) {
        this.montantPayer = montantPayer;
    }

    public Integer getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(Integer montantRestant) {
        this.montantRestant = montantRestant;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public TTiersPayant getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(TTiersPayant tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 79 * hash + Objects.hashCode(this.id);
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
        final ReglementCarnet other = (ReglementCarnet) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "ReglementCarnet{" + "id=" + id + ", description=" + description + ", montantPaye=" + montantPaye
                + ", montantPayer=" + montantPayer + ", montantRestant=" + montantRestant + ", createdAt=" + createdAt
                + '}';
    }

    public Integer getReference() {
        return reference;
    }

    public void setReference(Integer reference) {
        this.reference = reference;
    }

}
