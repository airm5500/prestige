/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import com.vladmihalcea.hibernate.type.json.JsonStringType;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

/**
 *
 * @author koben
 */
@Entity
@TypeDef(name = "json", typeClass = JsonStringType.class)
@Table(name = "historique_importation")
@NamedQueries({ @NamedQuery(name = "HistoriqueImportation.findAll", query = " SELECT o FROM HistoriqueImportation o ")

})
public class HistoriqueImportation implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Column(name = "id", nullable = false, length = 40)
    private String id = UUID.randomUUID().toString();
    @OneToOne
    @JoinColumn(name = "user", referencedColumnName = "lg_USER_ID")
    private TUser user;
    @Type(type = "json")
    @Column(columnDefinition = "json", name = "detail")
    private List<HistoriqueImportValue> deatils = new ArrayList<>();
    @Column(name = "mvtdate", nullable = false, updatable = false)
    private LocalDate mvtDate = LocalDate.now();
    @Column(name = "createdAt", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "montant_achat", nullable = false)
    private Integer montantAchat;
    @Column(name = "montant_vente", nullable = false)
    private Integer montantVente;
    @Column(name = "nbre_ligne", nullable = false)
    private Integer nbreLigne;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public HistoriqueImportation user(TUser user) {
        this.user = user;
        return this;
    }

    public HistoriqueImportation mvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
        return this;
    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

    public HistoriqueImportation createdAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public HistoriqueImportation montantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
        return this;
    }

    public Integer getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
    }

    public HistoriqueImportation montantVente(Integer montantVente) {
        this.montantVente = montantVente;
        return this;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public HistoriqueImportation nbreLigne(Integer nbreLigne) {
        this.nbreLigne = nbreLigne;
        return this;
    }

    public Integer getNbreLigne() {
        return nbreLigne;
    }

    public void setNbreLigne(Integer nbreLigne) {
        this.nbreLigne = nbreLigne;
    }

    public List<HistoriqueImportValue> getDeatils() {
        if (this.deatils == null) {
            this.deatils = new ArrayList<>();
        }
        return deatils;
    }

    public void setDeatils(List<HistoriqueImportValue> deatils) {
        if (this.deatils == null) {
            this.deatils = new ArrayList<>();
        }
        this.deatils = deatils;
    }

    public HistoriqueImportation deatils(List<HistoriqueImportValue> deatils) {
        this.deatils = deatils;
        return this;
    }

    public HistoriqueImportation addDetail(HistoriqueImportValue details) {
        if (this.deatils == null) {
            this.deatils = new ArrayList<>();

        }
        getDeatils().add(details);
        return this;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 89 * hash + Objects.hashCode(this.id);
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
        final HistoriqueImportation other = (HistoriqueImportation) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

}
