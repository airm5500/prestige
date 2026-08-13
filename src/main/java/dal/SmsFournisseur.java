package dal;

import dal.enumeration.DlrMode;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.NotNull;

/**
 * Fournisseur d'envoi de SMS (Orange, LeTexto...) configurable depuis l'écran "Fournisseurs SMS".
 *
 * Un seul fournisseur est "en vigueur" à la fois : c'est lui qui prend en charge tous les envois. Les paramètres
 * propres à chaque fournisseur (endpoints, credentials, sender...) sont portés par {@link SmsFournisseurParam}.
 *
 * @author koben
 */
@Entity
@Table(name = "sms_fournisseur", uniqueConstraints = {
        @UniqueConstraint(name = "sms_fournisseur_code_un", columnNames = { "code" }) })
@NamedQueries({ @NamedQuery(name = "SmsFournisseur.all", query = "SELECT o FROM SmsFournisseur o ORDER BY o.code"),
        @NamedQuery(name = "SmsFournisseur.findByCode", query = "SELECT o FROM SmsFournisseur o WHERE o.code=:code"),
        @NamedQuery(name = "SmsFournisseur.findEnVigueur", query = "SELECT o FROM SmsFournisseur o WHERE o.enVigueur=true") })
public class SmsFournisseur implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 50)
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "code", nullable = false, length = 20)
    private String code;
    @NotNull
    @Column(name = "libelle", nullable = false, length = 100)
    private String libelle;
    @NotNull
    @Column(name = "actif", nullable = false)
    private boolean actif = true;
    @NotNull
    @Column(name = "en_vigueur", nullable = false)
    private boolean enVigueur;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "dlr_mode", nullable = false, length = 20)
    private DlrMode dlrMode = DlrMode.POLLING;
    @Column(name = "dlr_callback_url", length = 500)
    private String dlrCallbackUrl;
    @NotNull
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @OneToMany(mappedBy = "fournisseur", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<SmsFournisseurParam> params = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public boolean isEnVigueur() {
        return enVigueur;
    }

    public void setEnVigueur(boolean enVigueur) {
        this.enVigueur = enVigueur;
    }

    public DlrMode getDlrMode() {
        return dlrMode;
    }

    public void setDlrMode(DlrMode dlrMode) {
        this.dlrMode = dlrMode;
    }

    public String getDlrCallbackUrl() {
        return dlrCallbackUrl;
    }

    public void setDlrCallbackUrl(String dlrCallbackUrl) {
        this.dlrCallbackUrl = dlrCallbackUrl;
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

    public List<SmsFournisseurParam> getParams() {
        return params;
    }

    public void setParams(List<SmsFournisseurParam> params) {
        this.params = params;
    }

    /** Valeur d'un paramètre du fournisseur, ou {@code null} s'il n'est pas renseigné. */
    public String getParamValue(String cle) {
        for (SmsFournisseurParam p : params) {
            if (p.getCle().equals(cle)) {
                return p.getValeur();
            }
        }
        return null;
    }

    /** Crée ou met à jour un paramètre du fournisseur. */
    public void setParamValue(String cle, String valeur) {
        for (SmsFournisseurParam p : params) {
            if (p.getCle().equals(cle)) {
                p.setValeur(valeur);
                return;
            }
        }
        params.add(new SmsFournisseurParam(this, cle, valeur));
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 31 * hash + Objects.hashCode(this.id);
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
        return Objects.equals(this.id, ((SmsFournisseur) obj).id);
    }

}
