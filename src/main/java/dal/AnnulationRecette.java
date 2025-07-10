/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.Statut;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "annulation_recette")
public class AnnulationRecette extends AbstractEntity {

    private static final long serialVersionUID = 1L;
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
    @ManyToOne
    @JoinColumn(name = "preenregistrement_id", referencedColumnName = "lg_PREENREGISTREMENT_ID", nullable = false)
    private TPreenregistrement preenregistrement;
    @NotNull
    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "lg_USER_ID", nullable = false)
    private TUser user;
    @NotNull
    @JoinColumn(name = "caissier_id", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser caissier;
    @NotNull
    @Column(name = "mvtDate", nullable = false)
    private LocalDate mvtDate;

    public Integer getMontantVente() {
        return montantVente;
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

    public TPreenregistrement getPreenregistrement() {
        return preenregistrement;
    }

    public void setPreenregistrement(TPreenregistrement preenregistrement) {
        this.preenregistrement = preenregistrement;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public TUser getCaissier() {
        return caissier;
    }

    public void setCaissier(TUser caissier) {
        this.caissier = caissier;
    }

    @Override
    public String toString() {
        return "AnnulationRecette{" + "montantVente=" + montantVente + ", montantRegle=" + montantRegle
                + ", montantTiersPayant=" + montantTiersPayant + ", montantPaye=" + montantPaye + ", preenregistrement="
                + preenregistrement + '}';
    }

    public AnnulationRecette() {
        super();
        this.id = UUID.randomUUID().toString();
        this.status = Statut.ENABLE;
        this.createdAt = this.modifiedAt = LocalDateTime.now();

    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

}
