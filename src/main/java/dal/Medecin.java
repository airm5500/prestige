/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "medecin")
@NamedQueries({
        @NamedQuery(name = "Medecin.findByNumOrder", query = "SELECT o FROM Medecin o WHERE o.numOrdre =:numorder"),
        @NamedQuery(name = "Medecin.findAllByNonOrNumOrder", query = "SELECT o FROM Medecin o WHERE o.numOrdre LIKE :numorder OR o.nom LIKE :nom") })
public class Medecin implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @NotBlank
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "created_at", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    protected LocalDateTime createdAt = LocalDateTime.now();
    @NotNull
    @NotBlank
    @Column(name = "num_ordre", nullable = false, unique = true)
    private String numOrdre;
    @Column(name = "nom")
    private String nom;
    @Column(name = "commentaire")
    private String commentaire;

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

    public String getNumOrdre() {
        return numOrdre;
    }

    public void setNumOrdre(String numOrdre) {
        this.numOrdre = numOrdre;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 61 * hash + Objects.hashCode(this.id);
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
        final Medecin other = (Medecin) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    public Medecin(String numOrdre, String nom, String commentaire) {
        this.numOrdre = numOrdre;
        this.nom = nom;
        this.commentaire = commentaire;
    }

    public Medecin() {
    }

    @Override
    public String toString() {
        return "Medecin{" + "id=" + id + ", numOrdre=" + numOrdre + ", nom=" + nom + '}';
    }

}
