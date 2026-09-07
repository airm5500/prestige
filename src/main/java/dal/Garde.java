package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * Une periode d'activite nommee : la garde.
 *
 * <p>
 * Les bornes portent l'HEURE et pas seulement le jour. Une garde va typiquement de 20 h a 8 h le lendemain : la ramener
 * a « du 5 au 6 septembre » ferait entrer dans l'analyse deux journees entieres d'activite ordinaire, qui ecraseraient
 * completement ce qui s'est passe la nuit. C'est cette precision qui justifie la table.
 * </p>
 *
 * <p>
 * Aucun indicateur n'est stocke : le chiffre d'affaires, les produits vendus et les tranches horaires sont recalcules
 * depuis les ventes a chaque consultation. Les figer les desynchroniserait des donnees operationnelles des la premiere
 * annulation de vente.
 * </p>
 */
@Entity
@Table(name = "garde")
public class Garde implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @NotBlank
    private String id = UUID.randomUUID().toString();

    @NotNull
    @NotBlank
    @Column(name = "libelle", nullable = false, length = 120)
    private String libelle;

    @NotNull
    @Column(name = "date_debut", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime dateDebut;

    @NotNull
    @Column(name = "date_fin", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime dateFin;

    @NotNull
    @Column(name = "created_at", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public LocalDateTime getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDateTime dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDateTime getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDateTime dateFin) {
        this.dateFin = dateFin;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    /** Duree de la garde en minutes. Sert a rapporter les indicateurs a une base comparable. */
    public long dureeMinutes() {
        if (dateDebut == null || dateFin == null) {
            return 0L;
        }
        return java.time.Duration.between(dateDebut, dateFin).toMinutes();
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof Garde)) {
            return false;
        }
        return Objects.equals(id, ((Garde) obj).id);
    }

    @Override
    public String toString() {
        return "Garde[" + id + " " + libelle + "]";
    }
}
