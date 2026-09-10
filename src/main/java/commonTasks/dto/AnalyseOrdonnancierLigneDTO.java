package commonTasks.dto;

import java.io.Serializable;

/**
 * Une ligne de l'analyse du registre, mise a plat.
 *
 * <p>
 * L'ecran presente trois palmares dans trois grilles. L'edition et l'export, eux, ont besoin d'une table unique : la
 * colonne « section » dit de quel palmares vient la ligne.
 * </p>
 */
public class AnalyseOrdonnancierLigneDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String section = "";
    private String libelle = "";
    /** CIP et code tableau pour un produit, numero d'ordre pour un medecin, vide pour un client. */
    private String complement = "";
    private Integer delivrances = 0;
    private Long quantite = 0L;
    private Long montant = 0L;

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getComplement() {
        return complement;
    }

    public void setComplement(String complement) {
        this.complement = complement;
    }

    public Integer getDelivrances() {
        return delivrances;
    }

    public void setDelivrances(Integer delivrances) {
        this.delivrances = delivrances;
    }

    public Long getQuantite() {
        return quantite;
    }

    public void setQuantite(Long quantite) {
        this.quantite = quantite;
    }

    public Long getMontant() {
        return montant;
    }

    public void setMontant(Long montant) {
        this.montant = montant;
    }
}
