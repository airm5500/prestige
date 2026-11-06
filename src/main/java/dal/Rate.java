package dal;

import java.io.Serializable;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name = "taux_produit")
public class Rate implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false)
    private String id = UUID.randomUUID().toString();
    @Column(name = "compte_tiers_payant_id", nullable = false)
    private String compteTiersPayantId;
    @Column(name = "sale_iem_id", nullable = false)
    private String saleIemId;
    private float taux;
    /**
     * Lot « base par tiers-payant » (Q2.5) : prix de reference unitaire applique a cet organisme sur cette ligne, ou
     * null (prix de vente, ou regle du minimum a 0). Le ticket le relit pour imprimer la part de la ligne.
     */
    @Column(name = "base_ligne")
    private Integer baseLigne;

    public Rate() {
    }

    public Integer getBaseLigne() {
        return baseLigne;
    }

    public void setBaseLigne(Integer baseLigne) {
        this.baseLigne = baseLigne;
    }

    public Rate(String saleIemId, String compteTiersPayantId, float taux) {
        this.compteTiersPayantId = compteTiersPayantId;
        this.taux = taux;
        this.saleIemId = saleIemId;
    }

    public String getCompteTiersPayantId() {
        return compteTiersPayantId;
    }

    public float getTaux() {
        return taux;
    }

    public void setCompteTiersPayantId(String compteTiersPayantId) {
        this.compteTiersPayantId = compteTiersPayantId;
    }

    public void setTaux(float taux) {
        this.taux = taux;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSaleIemId() {
        return saleIemId;
    }

    public void setSaleIemId(String saleIemId) {
        this.saleIemId = saleIemId;
    }

    @Override
    public String toString() {
        return "Rate{" + "id=" + id + ", compteTiersPayantId=" + compteTiersPayantId + ", saleIemId=" + saleIemId
                + ", taux=" + taux + '}';
    }

}
