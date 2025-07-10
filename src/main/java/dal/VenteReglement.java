/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 *
 */
@Entity
@Table(name = "vente_reglement", indexes = { @Index(name = "indexflag_idVenteReglement", columnList = "flag_id")

})
public class VenteReglement implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 50)
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "montant", nullable = false)
    private Integer montant = 0;
    @NotNull
    @Column(name = "montant_attentu", nullable = false)
    private Integer montantAttentu = 0;
    @NotNull
    @Column(name = "flaged_amount", nullable = false)
    private Integer flagedAmount = 0;

    @NotNull
    @JoinColumn(name = "type_regelement", referencedColumnName = "lg_TYPE_REGLEMENT_ID")
    @ManyToOne
    private TTypeReglement typeReglement;
    @NotNull
    @JoinColumn(name = "vente_id", referencedColumnName = "lg_PREENREGISTREMENT_ID")
    @ManyToOne
    private TPreenregistrement preenregistrement;
    @NotNull
    @Column(name = "mvtDate")
    private LocalDateTime mvtDate = LocalDateTime.now();

    @Column(name = "flag_id")
    private String flagId;
    @NotNull
    @Column(name = "ug_amount", nullable = false, columnDefinition = "int default 0 ")
    private Integer ugAmount = 0;
    @NotNull
    @Column(name = "ug_amount_net", nullable = false, columnDefinition = "int default 0 ")
    private Integer ugNetAmount = 0;
    @NotNull
    @Column(name = "amount_non_ca", nullable = false, columnDefinition = "int default 0 ")
    private Integer amountNonCa = 0;

    @Column(name = "montant_verse", columnDefinition = "int default 0 ")
    private Integer montantVerse = 0;

    public String getId() {
        return id;
    }

    public Integer getMontantVerse() {
        return montantVerse;
    }

    public void setMontantVerse(Integer montantVerse) {
        this.montantVerse = montantVerse;
    }

    public Integer getFlagedAmount() {
        return flagedAmount;
    }

    public void setFlagedAmount(Integer flagedAmount) {
        this.flagedAmount = flagedAmount;
    }

    public Integer getMontantAttentu() {
        return montantAttentu;
    }

    public void setMontantAttentu(Integer montantAttentu) {
        this.montantAttentu = montantAttentu;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public TTypeReglement getTypeReglement() {
        return typeReglement;
    }

    public void setTypeReglement(TTypeReglement typeReglement) {
        this.typeReglement = typeReglement;
    }

    public TPreenregistrement getPreenregistrement() {
        return preenregistrement;
    }

    public void setPreenregistrement(TPreenregistrement preenregistrement) {
        this.preenregistrement = preenregistrement;
    }

    public LocalDateTime getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDateTime mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getFlagId() {
        return flagId;
    }

    public void setFlagId(String flagId) {
        this.flagId = flagId;
    }

    public Integer getUgAmount() {
        return ugAmount;
    }

    public void setUgAmount(Integer ugAmount) {
        this.ugAmount = ugAmount;
    }

    public Integer getUgNetAmount() {
        return ugNetAmount;
    }

    public void setUgNetAmount(Integer ugNetAmount) {
        this.ugNetAmount = ugNetAmount;
    }

    public Integer getAmountNonCa() {
        return amountNonCa;
    }

    public void setAmountNonCa(Integer amountNonCa) {
        this.amountNonCa = amountNonCa;
    }

}
