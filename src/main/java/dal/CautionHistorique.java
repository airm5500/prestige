/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "caution_historique")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "CautionHistorique.findAllByTiersPayantId", query = "SELECT o FROM CautionHistorique o WHERE o.caution.id=:cautionId ORDER BY o.mvtDate DESC") })
public class CautionHistorique implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 100)
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "montant", nullable = false, updatable = false)
    private int montant;
    @NotNull
    @Column(name = "mvt_date", nullable = false, updatable = false)
    private LocalDateTime mvtDate = LocalDateTime.now();
    @NotNull
    @JoinColumn(name = "caution_id", referencedColumnName = "id", nullable = false, updatable = false)
    @ManyToOne
    private Caution caution;
    @NotNull
    @JoinColumn(name = "user_id", referencedColumnName = "lg_USER_ID", nullable = false, updatable = false)
    @ManyToOne
    private TUser user;

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

    public Caution getCaution() {
        return caution;
    }

    public void setCaution(Caution caution) {
        this.caution = caution;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
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
        final CautionHistorique other = (CautionHistorique) obj;
        return Objects.equals(this.id, other.id);
    }

}
