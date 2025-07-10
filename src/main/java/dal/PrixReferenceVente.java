package dal;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "prix_reference_vente", uniqueConstraints = { @UniqueConstraint(columnNames = {
        "preenregistrement_detail_id", "produit_id", "compte_client_tiers_payant_id" }) })
public class PrixReferenceVente implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Column(name = "id")
    private String id = UUID.randomUUID().toString();
    @NotNull
    @Column(name = "compte_client_tiers_payant_id", nullable = false) // a renomer
    private String compteClientTiersPayantId;
    @NotNull
    @Column(name = "produit_id", nullable = false)
    private String produitId;
    @Min(5)
    @Column(name = "prix_uni", length = 8, nullable = false)
    private int prixUni;
    @Min(5)
    @Column(name = "montant", length = 8, nullable = false)
    private int montant;
    @NotNull
    @JoinColumn(name = "preenregistrement_detail_id", referencedColumnName = "lg_PREENREGISTREMENT_DETAIL_ID", nullable = false)
    @ManyToOne(optional = false)
    private TPreenregistrementDetail preenregistrementDetail;
    @NotNull
    @JoinColumn(name = "prix_reference_id", referencedColumnName = "id", nullable = false)
    @ManyToOne(optional = false)
    private PrixReference prixReference;

    public String getId() {
        return id;
    }

    public PrixReference getPrixReference() {
        return prixReference;
    }

    public void setPrixReference(PrixReference prixReference) {
        this.prixReference = prixReference;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCompteClientTiersPayantId() {
        return compteClientTiersPayantId;
    }

    public void setCompteClientTiersPayantId(String compteClientTiersPayantId) {
        this.compteClientTiersPayantId = compteClientTiersPayantId;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public int getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(int prixUni) {
        this.prixUni = prixUni;
    }

    public int getMontant() {
        return montant;
    }

    public void setMontant(int montant) {
        this.montant = montant;
    }

    public TPreenregistrementDetail getPreenregistrementDetail() {
        return preenregistrementDetail;
    }

    public void setPreenregistrementDetail(TPreenregistrementDetail preenregistrementDetail) {
        this.preenregistrementDetail = preenregistrementDetail;
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
        final PrixReferenceVente other = (PrixReferenceVente) obj;
        return Objects.equals(this.id, other.id);
    }

}
