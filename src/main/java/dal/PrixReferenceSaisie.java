package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

/**
 * Plan du 06/11/2026, point 5.1 : prix ou taux de reference saisi a la caisse, garde sur la vente jusqu'a sa cloture
 * (une ligne par ligne de vente et par tiers-payant). A la cloture, il est recopie sur la fiche article
 * (prix_reference) et journalise, puis retire.
 */
@Entity
@Table(name = "prix_reference_saisie")
public class PrixReferenceSaisie implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "id", length = 40, nullable = false)
    private String id = UUID.randomUUID().toString();
    @Column(name = "vente_id", length = 40, nullable = false)
    private String venteId;
    @Column(name = "detail_id", length = 40, nullable = false)
    private String detailId;
    @Column(name = "produit_id", length = 70, nullable = false)
    private String produitId;
    @Column(name = "tiers_payant_id", length = 70, nullable = false)
    private String tiersPayantId;
    @Enumerated(EnumType.STRING)
    @Column(name = "type_prix", length = 20, nullable = false)
    private PrixReferenceType type;
    @Column(name = "valeur", nullable = false)
    private int valeur;
    @Column(name = "valeur_taux")
    private Float valeurTaux;
    @Column(name = "utilisateur_id", length = 40)
    private String utilisateurId;
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "date_saisie", nullable = false)
    private Date dateSaisie = new Date();

    public String getId() {
        return id;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getDetailId() {
        return detailId;
    }

    public void setDetailId(String detailId) {
        this.detailId = detailId;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public PrixReferenceType getType() {
        return type;
    }

    public void setType(PrixReferenceType type) {
        this.type = type;
    }

    public int getValeur() {
        return valeur;
    }

    public void setValeur(int valeur) {
        this.valeur = valeur;
    }

    public Float getValeurTaux() {
        return valeurTaux;
    }

    public void setValeurTaux(Float valeurTaux) {
        this.valeurTaux = valeurTaux;
    }

    public String getUtilisateurId() {
        return utilisateurId;
    }

    public void setUtilisateurId(String utilisateurId) {
        this.utilisateurId = utilisateurId;
    }

    public Date getDateSaisie() {
        return dateSaisie;
    }

    public void setDateSaisie(Date dateSaisie) {
        this.dateSaisie = dateSaisie;
    }
}
