package dal;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * Referentiel des motifs de suggestion de reserve. Administrable en base : ajouter un motif ne demande aucune
 * modification de code.
 */
@Entity
@Table(name = "motif_suggestion_reserve")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "MotifSuggestionReserve.findAll", query = "SELECT m FROM MotifSuggestionReserve m WHERE m.actif = true ORDER BY m.libelle ASC"),
        @NamedQuery(name = "MotifSuggestionReserve.findByCategorie", query = "SELECT m FROM MotifSuggestionReserve m WHERE m.actif = true AND (m.categorie IS NULL OR m.categorie = :categorie) ORDER BY m.libelle ASC") })
public class MotifSuggestionReserve implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "libelle", nullable = false, length = 250)
    private String libelle;

    /** RAYON, RESERVE, ou null lorsque le motif vaut pour les deux sens. */
    @Column(name = "categorie", length = 10)
    private String categorie;

    @Column(name = "actif")
    private boolean actif = true;

    public MotifSuggestionReserve() {
    }

    public MotifSuggestionReserve(Integer id) {
        this.id = id;
    }

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

    public String getCategorie() {
        return categorie;
    }

    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    @Override
    public int hashCode() {
        return (id != null ? id.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof MotifSuggestionReserve)) {
            return false;
        }
        MotifSuggestionReserve other = (MotifSuggestionReserve) object;
        return !((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id)));
    }

    @Override
    public String toString() {
        return "dal.MotifSuggestionReserve[ id=" + id + " ]";
    }
}
