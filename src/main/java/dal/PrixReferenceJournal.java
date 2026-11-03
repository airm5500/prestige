package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

/**
 * Journal des prix de reference (cas 2 du 03/11/2026, Q2.6) : une ligne par ajout, modification ou suppression, que
 * l'ecriture vienne de la fiche article ou de la caisse. Les identifiants sont copies (pas de cle etrangere) : une
 * suppression physique du prix de reference ou du produit ne fait pas disparaitre l'historique.
 */
@Entity
@Table(name = "prix_reference_journal")
@NamedQueries({
        @NamedQuery(name = "PrixReferenceJournal.findByProduitId", query = "SELECT o FROM PrixReferenceJournal o WHERE o.produitId = :produitId ORDER BY o.dateAction DESC") })
public class PrixReferenceJournal implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "id", length = 40, nullable = false)
    private String id = UUID.randomUUID().toString();
    @Column(name = "prix_reference_id", length = 70)
    private String prixReferenceId;
    @Column(name = "produit_id", length = 70, nullable = false)
    private String produitId;
    @Column(name = "tiers_payant_id", length = 70, nullable = false)
    private String tiersPayantId;
    @Enumerated(EnumType.STRING)
    @Column(name = "action", length = 15, nullable = false)
    private PrixReferenceJournalAction action;
    @Column(name = "ancienne_valeur")
    private Integer ancienneValeur;
    @Column(name = "nouvelle_valeur")
    private Integer nouvelleValeur;
    @Column(name = "ancien_taux")
    private Float ancienTaux;
    @Column(name = "nouveau_taux")
    private Float nouveauTaux;
    @Enumerated(EnumType.STRING)
    @Column(name = "ancien_type", length = 20)
    private PrixReferenceType ancienType;
    @Enumerated(EnumType.STRING)
    @Column(name = "nouveau_type", length = 20)
    private PrixReferenceType nouveauType;
    @Column(name = "utilisateur_id", length = 40)
    private String utilisateurId;
    @Column(name = "utilisateur", length = 120)
    private String utilisateur;
    @Column(name = "date_action", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dateAction = new Date();
    @Column(name = "vente_id", length = 40)
    private String venteId;
    @Column(name = "poste", length = 80)
    private String poste;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPrixReferenceId() {
        return prixReferenceId;
    }

    public void setPrixReferenceId(String prixReferenceId) {
        this.prixReferenceId = prixReferenceId;
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

    public PrixReferenceJournalAction getAction() {
        return action;
    }

    public void setAction(PrixReferenceJournalAction action) {
        this.action = action;
    }

    public Integer getAncienneValeur() {
        return ancienneValeur;
    }

    public void setAncienneValeur(Integer ancienneValeur) {
        this.ancienneValeur = ancienneValeur;
    }

    public Integer getNouvelleValeur() {
        return nouvelleValeur;
    }

    public void setNouvelleValeur(Integer nouvelleValeur) {
        this.nouvelleValeur = nouvelleValeur;
    }

    public Float getAncienTaux() {
        return ancienTaux;
    }

    public void setAncienTaux(Float ancienTaux) {
        this.ancienTaux = ancienTaux;
    }

    public Float getNouveauTaux() {
        return nouveauTaux;
    }

    public void setNouveauTaux(Float nouveauTaux) {
        this.nouveauTaux = nouveauTaux;
    }

    public PrixReferenceType getAncienType() {
        return ancienType;
    }

    public void setAncienType(PrixReferenceType ancienType) {
        this.ancienType = ancienType;
    }

    public PrixReferenceType getNouveauType() {
        return nouveauType;
    }

    public void setNouveauType(PrixReferenceType nouveauType) {
        this.nouveauType = nouveauType;
    }

    public String getUtilisateurId() {
        return utilisateurId;
    }

    public void setUtilisateurId(String utilisateurId) {
        this.utilisateurId = utilisateurId;
    }

    public String getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(String utilisateur) {
        this.utilisateur = utilisateur;
    }

    public Date getDateAction() {
        return dateAction;
    }

    public void setDateAction(Date dateAction) {
        this.dateAction = dateAction;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getPoste() {
        return poste;
    }

    public void setPoste(String poste) {
        this.poste = poste;
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || getClass() != obj.getClass()) {
            return false;
        }
        return Objects.equals(this.id, ((PrixReferenceJournal) obj).id);
    }
}
