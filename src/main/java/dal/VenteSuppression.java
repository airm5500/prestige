package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 * Trace des produits retires d'une vente (type PRODUIT) et des ventes
 * abandonnees / supprimees (type VENTE, une ligne par produit de la vente).
 */
@Entity
@Table(name = "vente_suppression", indexes = {
        @Index(name = "idx_vente_suppression_date", columnList = "mvt_date"),
        @Index(name = "idx_vente_suppression_user", columnList = "user_id"),
        @Index(name = "idx_vente_suppression_produit", columnList = "produit_id"),
        @Index(name = "idx_vente_suppression_cip", columnList = "produit_cip") })
public class VenteSuppression implements Serializable {

    private static final long serialVersionUID = 1L;

    public static final String TYPE_PRODUIT = "PRODUIT";
    public static final String TYPE_VENTE = "VENTE";

    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 50)
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "type_suppression", nullable = false, length = 10)
    private String typeSuppression;
    @Column(name = "vente_id", length = 50)
    private String venteId;
    @Column(name = "vente_ref", length = 70)
    private String venteRef;
    @Column(name = "produit_id", length = 50)
    private String produitId;
    @Column(name = "produit_cip", length = 30)
    private String produitCip;
    @Column(name = "produit_libelle", length = 255)
    private String produitLibelle;
    @NotNull
    @Column(name = "quantite", nullable = false)
    private Integer quantite = 0;
    @Column(name = "user_id", length = 50)
    private String userId;
    @Column(name = "user_name", length = 150)
    private String userName;
    @NotNull
    @Column(name = "mvt_date", nullable = false)
    private LocalDateTime mvtDate = LocalDateTime.now();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTypeSuppression() {
        return typeSuppression;
    }

    public void setTypeSuppression(String typeSuppression) {
        this.typeSuppression = typeSuppression;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getVenteRef() {
        return venteRef;
    }

    public void setVenteRef(String venteRef) {
        this.venteRef = venteRef;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getProduitCip() {
        return produitCip;
    }

    public void setProduitCip(String produitCip) {
        this.produitCip = produitCip;
    }

    public String getProduitLibelle() {
        return produitLibelle;
    }

    public void setProduitLibelle(String produitLibelle) {
        this.produitLibelle = produitLibelle;
    }

    public Integer getQuantite() {
        return quantite;
    }

    public void setQuantite(Integer quantite) {
        this.quantite = quantite;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public LocalDateTime getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDateTime mvtDate) {
        this.mvtDate = mvtDate;
    }
}
