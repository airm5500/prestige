package dal;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.NotNull;

/**
 * Paramètre clé/valeur d'un {@link SmsFournisseur} (endpoint, credential, sender...).
 *
 * Le modèle clé/valeur permet d'ajouter un fournisseur avec ses propres paramètres sans migration de schéma.
 *
 * @author koben
 */
@Entity
@Table(name = "sms_fournisseur_param", uniqueConstraints = {
        @UniqueConstraint(name = "sms_fournisseur_param_un", columnNames = { "fournisseur_id", "cle" }) })
public class SmsFournisseurParam implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 50)
    private String id = UUID.randomUUID().toString();
    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "fournisseur_id", referencedColumnName = "id", nullable = false)
    private SmsFournisseur fournisseur;
    @NotNull
    @Column(name = "cle", nullable = false, length = 80)
    private String cle;
    @Column(name = "valeur", length = 2000)
    private String valeur;

    public SmsFournisseurParam() {
    }

    public SmsFournisseurParam(SmsFournisseur fournisseur, String cle, String valeur) {
        this.fournisseur = fournisseur;
        this.cle = cle;
        this.valeur = valeur;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public SmsFournisseur getFournisseur() {
        return fournisseur;
    }

    public void setFournisseur(SmsFournisseur fournisseur) {
        this.fournisseur = fournisseur;
    }

    public String getCle() {
        return cle;
    }

    public void setCle(String cle) {
        this.cle = cle;
    }

    public String getValeur() {
        return valeur;
    }

    public void setValeur(String valeur) {
        this.valeur = valeur;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 37 * hash + Objects.hashCode(this.id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || getClass() != obj.getClass()) {
            return false;
        }
        return Objects.equals(this.id, ((SmsFournisseurParam) obj).id);
    }

}
