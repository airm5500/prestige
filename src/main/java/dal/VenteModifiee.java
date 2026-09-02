package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 * Mouchard des ventes modifiees (point 6) : une ligne par modification d'une vente cloturee, avec le detail produit
 * dans {@link VenteModifieeLigne}.
 */
@Entity
@Table(name = "vente_modifiee")
public class VenteModifiee implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Modification des produits de la vente (ajout, retrait, quantite, prix). */
    public static final String TYPE_PRODUITS = "PRODUITS";
    /** Modification des informations client / tiers payant / numero de bon. */
    public static final String TYPE_INFOS = "INFOS";
    /** Modification de la date de la vente. */
    public static final String TYPE_DATE = "DATE";

    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 50)
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "type_modification", nullable = false, length = 10)
    private String typeModification;
    @Column(name = "vente_id", length = 50)
    private String venteId;
    @Column(name = "vente_origine_id", length = 50)
    private String venteOrigineId;
    @Column(name = "vente_ref", length = 70)
    private String venteRef;
    @Column(name = "user_id", length = 50)
    private String userId;
    @Column(name = "user_name", length = 150)
    private String userName;
    @NotNull
    @Column(name = "mvt_date", nullable = false)
    private LocalDateTime mvtDate = LocalDateTime.now();
    @Column(name = "montant_avant", nullable = false)
    private Integer montantAvant = 0;
    @Column(name = "montant_apres", nullable = false)
    private Integer montantApres = 0;
    @Column(name = "description", length = 1000)
    private String description;
    @OneToMany(mappedBy = "modification", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VenteModifieeLigne> lignes = new ArrayList<>();

    public void ajouterLigne(VenteModifieeLigne ligne) {
        ligne.setModification(this);
        lignes.add(ligne);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTypeModification() {
        return typeModification;
    }

    public void setTypeModification(String typeModification) {
        this.typeModification = typeModification;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getVenteOrigineId() {
        return venteOrigineId;
    }

    public void setVenteOrigineId(String venteOrigineId) {
        this.venteOrigineId = venteOrigineId;
    }

    public String getVenteRef() {
        return venteRef;
    }

    public void setVenteRef(String venteRef) {
        this.venteRef = venteRef;
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

    public Integer getMontantAvant() {
        return montantAvant;
    }

    public void setMontantAvant(Integer montantAvant) {
        this.montantAvant = montantAvant;
    }

    public Integer getMontantApres() {
        return montantApres;
    }

    public void setMontantApres(Integer montantApres) {
        this.montantApres = montantApres;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<VenteModifieeLigne> getLignes() {
        return lignes;
    }

    public void setLignes(List<VenteModifieeLigne> lignes) {
        this.lignes = lignes;
    }
}
