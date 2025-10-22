package dal;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "prix_reference", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "tiersPayant_id", "produit_id" }) })
@NamedQueries({
        @NamedQuery(name = "PrixReference.findByProduitId", query = "SELECT o FROM PrixReference o WHERE o.produit.lgFAMILLEID =:produitId"),
        @NamedQuery(name = "PrixReference.findByProduitIdAndTiersPayantId", query = "SELECT o FROM PrixReference o WHERE o.produit.lgFAMILLEID =:produitId AND o.tiersPayant.lgTIERSPAYANTID=:tiersPayantId "),
        @NamedQuery(name = "PrixReference.findByProduitIdAndTiersPayantIds", query = "SELECT o FROM PrixReference o WHERE o.produit.lgFAMILLEID =:produitId AND o.tiersPayant.lgTIERSPAYANTID IN(:tiersPayantIds) AND o.enabled=true ") })
public class PrixReference implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Column(name = "id")
    private String id = UUID.randomUUID().toString();
    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "tiersPayant_id", referencedColumnName = "lg_TIERS_PAYANT_ID", nullable = false)
    private TTiersPayant tiersPayant;
    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "produit_id", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    private TFamille produit;
    @Min(5)
    @Column(name = "valeur", length = 8, nullable = false)
    private int valeur;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type_prix", nullable = false, length = 20)
    private PrixReferenceType type;
    private boolean enabled = true;
    @Column(name = "valeur_taux")
    private Float valeurTaux;

    public String getId() {
        return id;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TTiersPayant getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(TTiersPayant tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public TFamille getProduit() {
        return produit;
    }

    public void setProduit(TFamille produit) {
        this.produit = produit;
    }

    public int getValeur() {
        return valeur;
    }

    public void setValeur(int valeur) {
        this.valeur = valeur;
    }

    public PrixReferenceType getType() {
        return type;
    }

    public void setType(PrixReferenceType type) {
        this.type = type;
    }

    public Float getValeurTaux() {
        return valeurTaux;
    }

    public void setValeurTaux(Float valeurTaux) {
        this.valeurTaux = valeurTaux;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 67 * hash + Objects.hashCode(this.id);
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
        final PrixReference other = (PrixReference) obj;
        return Objects.equals(this.id, other.id);
    }

    public float getTaux() {
        if (Objects.nonNull(valeurTaux)) {
            return valeurTaux / 100.0f;
        }
        return 1.0f;
    }
}
