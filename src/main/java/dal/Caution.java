/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "caution")
@XmlRootElement
public class Caution implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false)
    private String id;
    @NotNull
    @Column(name = "montant", nullable = false)
    private int montant;
    @NotNull
    @Column(name = "conso", nullable = false)
    private int conso;
    @NotNull
    @Column(name = "mvt_date", nullable = false, updatable = false)
    private LocalDateTime mvtDate = LocalDateTime.now();
    @ManyToOne
    @JoinColumn(name = "tiersPayant_id", referencedColumnName = "lg_TIERS_PAYANT_ID", nullable = false)
    private TTiersPayant tiersPayant;
    @NotNull
    @JoinColumn(name = "user_id", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser user;
    @OneToMany(cascade = { CascadeType.REMOVE, CascadeType.PERSIST }, mappedBy = "caution")
    private List<CautionHistorique> historiques = new ArrayList<>();
    @NotNull
    @Column(name = "mvt_update", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getMontant() {
        return montant;
    }

    public void setMontant(int montant) {
        this.montant = montant;
    }

    public LocalDateTime getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDateTime mvtDate) {
        this.mvtDate = mvtDate;
    }

    public TTiersPayant getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(TTiersPayant tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public List<CautionHistorique> getHistoriques() {
        return historiques;
    }

    public void setHistoriques(List<CautionHistorique> historiques) {
        this.historiques = historiques;
    }

    public int getConso() {
        return conso;
    }

    public void setConso(int conso) {
        this.conso = conso;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 41 * hash + Objects.hashCode(this.id);
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
        final Caution other = (Caution) obj;
        return Objects.equals(this.id, other.id);
    }

}
