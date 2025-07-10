/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "retour_carnet")
public class RetourCarnet implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 11)
    private Integer id;
    @Column(name = "libelle", nullable = false)
    private String libelle;
    @NotNull
    @JoinColumn(name = "user_id", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser user;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "status", nullable = false)
    private String status;
    @NotNull
    @JoinColumn(name = "tierspayant_id", referencedColumnName = "lg_TIERS_PAYANT_ID", nullable = false)
    @ManyToOne
    private TTiersPayant tierspayant;

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

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public TTiersPayant getTierspayant() {
        return tierspayant;
    }

    public void setTierspayant(TTiersPayant tierspayant) {
        this.tierspayant = tierspayant;
    }

}
