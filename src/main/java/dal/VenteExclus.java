/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.Statut;
import dal.enumeration.TypeTiersPayant;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "vente_exclu", indexes = {
        @Index(name = "VenteExclus_mvt_transaction_key", columnList = "mvt_transaction_key"),
        @Index(name = "VenteExclus_type_tiers_payant", columnList = "type_tiers_payant")

})
public class VenteExclus implements Serializable, Cloneable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @NotBlank
    protected String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "created_at", nullable = false)

    private LocalDateTime createdAt;
    @NotNull
    @Column(name = "modified_at", nullable = false)

    private LocalDateTime modifiedAt;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)

    private Statut status = Statut.IS_CLOSE;

    @NotNull
    @Column(name = "montantVente", nullable = false)
    private Integer montantVente = 0;
    @NotNull
    @Column(name = "montantRegle", nullable = false)
    private Integer montantRegle = 0;
    @NotNull
    @Column(name = "montantTiersPayant", nullable = false)
    private Integer montantTiersPayant = 0;
    @NotNull
    @Column(name = "montantPaye", nullable = false)
    private Integer montantPaye = 0;
    @NotNull
    @Column(name = "montant_client", nullable = false)
    private Integer montantClient = 0;
    @NotNull
    @ManyToOne
    @JoinColumn(name = "preenregistrement_id", referencedColumnName = "lg_PREENREGISTREMENT_ID", nullable = false)
    private TPreenregistrement preenregistrement;

    @NotNull
    @Column(name = "mvtDate", nullable = false)
    private LocalDate mvtDate = LocalDate.now();
    @NotNull
    @Column(name = "mvt_transaction_key", nullable = false)
    private String mvtTransactionKey;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "tiersPayant_id", referencedColumnName = "lg_TIERS_PAYANT_ID", nullable = false)
    private TTiersPayant tiersPayant;

    @ManyToOne
    @JoinColumn(name = "client_id", referencedColumnName = "lg_CLIENT_ID")
    private TClient client;
    @NotNull
    @ManyToOne
    @JoinColumn(name = "type_reglement_id", referencedColumnName = "lg_TYPE_REGLEMENT_ID", nullable = false)
    private TTypeReglement typeReglement;
    private Integer montantRemise = 0;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type_tiers_payant", nullable = false)
    private TypeTiersPayant typeTiersPayant;

    public Integer getMontantVente() {
        return montantVente;
    }

    public TTypeReglement getTypeReglement() {
        return typeReglement;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getModifiedAt() {
        return modifiedAt;
    }

    public void setModifiedAt(LocalDateTime modifiedAt) {
        this.modifiedAt = modifiedAt;
    }

    public Statut getStatus() {
        return status;
    }

    public void setStatus(Statut status) {
        this.status = status;
    }

    public void setTypeReglement(TTypeReglement typeReglement) {
        this.typeReglement = typeReglement;
    }

    public Integer getMontantRemise() {
        return montantRemise;
    }

    public void setMontantRemise(Integer montantRemise) {
        this.montantRemise = montantRemise;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public Integer getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(Integer montantRegle) {
        this.montantRegle = montantRegle;
    }

    public Integer getMontantTiersPayant() {
        return montantTiersPayant;
    }

    public void setMontantTiersPayant(Integer montantTiersPayant) {
        this.montantTiersPayant = montantTiersPayant;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public Integer getMontantClient() {
        return montantClient;
    }

    public void setMontantClient(Integer montantClient) {
        this.montantClient = montantClient;
    }

    public TPreenregistrement getPreenregistrement() {
        return preenregistrement;
    }

    public void setPreenregistrement(TPreenregistrement preenregistrement) {
        this.preenregistrement = preenregistrement;
    }

    public String getMvtTransactionKey() {
        return mvtTransactionKey;
    }

    public void setMvtTransactionKey(String mvtTransactionKey) {
        this.mvtTransactionKey = mvtTransactionKey;
    }

    public TTiersPayant getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(TTiersPayant tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public TClient getClient() {
        return client;
    }

    public void setClient(TClient client) {
        this.client = client;
    }

    @Override
    public String toString() {
        return "VenteExclus{" + "montantVente=" + montantVente + ", montantRegle=" + montantRegle
                + ", montantTiersPayant=" + montantTiersPayant + ", montantPaye=" + montantPaye + ", preenregistrement="
                + preenregistrement + '}';
    }

    public TypeTiersPayant getTypeTiersPayant() {
        return typeTiersPayant;
    }

    public void setTypeTiersPayant(TypeTiersPayant typeTiersPayant) {
        this.typeTiersPayant = typeTiersPayant;
    }

    public VenteExclus() {

        this.status = Statut.IS_CLOSE;

    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone(); // Shallow copy
    }
}
