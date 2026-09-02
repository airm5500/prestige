package dal;

import java.io.Serializable;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 * Detail produit d'une vente modifiee : ce qui a change pour un produit entre la vente d'origine et la vente
 * resultante.
 */
@Entity
@Table(name = "vente_modifiee_ligne")
public class VenteModifieeLigne implements Serializable {

    private static final long serialVersionUID = 1L;

    public static final String ACTION_AJOUT = "AJOUT";
    public static final String ACTION_RETRAIT = "RETRAIT";
    public static final String ACTION_QUANTITE = "QUANTITE";
    public static final String ACTION_PRIX = "PRIX";
    /** Ligne du recapitulatif d'une modification d'informations ou de date : element, valeur avant, valeur apres. */
    public static final String ACTION_INFO = "INFO";

    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 50)
    private String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "modification_id", referencedColumnName = "id", nullable = false)
    private VenteModifiee modification;
    @Column(name = "produit_id", length = 50)
    private String produitId;
    @Column(name = "produit_cip", length = 30)
    private String produitCip;
    @Column(name = "produit_libelle", length = 255)
    private String produitLibelle;
    @NotNull
    @Column(name = "action_ligne", nullable = false, length = 10)
    private String action;
    @Column(name = "qte_avant", nullable = false)
    private Integer qteAvant = 0;
    @Column(name = "qte_apres", nullable = false)
    private Integer qteApres = 0;
    @Column(name = "pu_avant", nullable = false)
    private Integer puAvant = 0;
    @Column(name = "pu_apres", nullable = false)
    private Integer puApres = 0;
    @Column(name = "montant_avant", nullable = false)
    private Integer montantAvant = 0;
    @Column(name = "montant_apres", nullable = false)
    private Integer montantApres = 0;
    @Column(name = "valeur_avant", length = 255)
    private String valeurAvant;
    @Column(name = "valeur_apres", length = 255)
    private String valeurApres;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public VenteModifiee getModification() {
        return modification;
    }

    public void setModification(VenteModifiee modification) {
        this.modification = modification;
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

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public Integer getQteAvant() {
        return qteAvant;
    }

    public void setQteAvant(Integer qteAvant) {
        this.qteAvant = qteAvant;
    }

    public Integer getQteApres() {
        return qteApres;
    }

    public void setQteApres(Integer qteApres) {
        this.qteApres = qteApres;
    }

    public Integer getPuAvant() {
        return puAvant;
    }

    public void setPuAvant(Integer puAvant) {
        this.puAvant = puAvant;
    }

    public Integer getPuApres() {
        return puApres;
    }

    public void setPuApres(Integer puApres) {
        this.puApres = puApres;
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

    public String getValeurAvant() {
        return valeurAvant;
    }

    public void setValeurAvant(String valeurAvant) {
        this.valeurAvant = valeurAvant;
    }

    public String getValeurApres() {
        return valeurApres;
    }

    public void setValeurApres(String valeurApres) {
        this.valeurApres = valeurApres;
    }
}
