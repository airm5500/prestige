package rest.service.dto;

/**
 * Une ligne du chiffre d'affaires d'un depot d'extension (retour du 17/09), telle que l'officine l'a demandee : un type
 * de vente, ce qu'il a rapporte, sa marge, le nombre de ventes, et la repartition entre ce qui a ete encaisse en
 * especes et ce qui reste a la charge d'un tiers payant.
 *
 * <p>
 * La colonne « reglement » de l'ancienne presentation a disparu : l'officine a demande a quoi elle servait, et la
 * reponse est qu'elle ne servait a rien. Le service ne la renseigne jamais pour ces lignes - elle etait
 * systematiquement vide a l'ecran comme a l'edition.
 */
public class DepotCaLigneDTO {

    private String typeVente;
    private long montantTTC;
    private long montantNet;
    private long marge;
    private long nbreVente;
    private long montantEspeces;
    private long montantTiersPayant;

    public DepotCaLigneDTO() {
    }

    public DepotCaLigneDTO(String typeVente, long montantTTC, long montantNet, long marge, long nbreVente,
            long montantEspeces, long montantTiersPayant) {
        this.typeVente = typeVente;
        this.montantTTC = montantTTC;
        this.montantNet = montantNet;
        this.marge = marge;
        this.nbreVente = nbreVente;
        this.montantEspeces = montantEspeces;
        this.montantTiersPayant = montantTiersPayant;
    }

    public String getTypeVente() {
        return typeVente;
    }

    public void setTypeVente(String typeVente) {
        this.typeVente = typeVente;
    }

    public long getMontantTTC() {
        return montantTTC;
    }

    public void setMontantTTC(long montantTTC) {
        this.montantTTC = montantTTC;
    }

    public long getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(long montantNet) {
        this.montantNet = montantNet;
    }

    public long getMarge() {
        return marge;
    }

    public void setMarge(long marge) {
        this.marge = marge;
    }

    public long getNbreVente() {
        return nbreVente;
    }

    public void setNbreVente(long nbreVente) {
        this.nbreVente = nbreVente;
    }

    public long getMontantEspeces() {
        return montantEspeces;
    }

    public void setMontantEspeces(long montantEspeces) {
        this.montantEspeces = montantEspeces;
    }

    public long getMontantTiersPayant() {
        return montantTiersPayant;
    }

    public void setMontantTiersPayant(long montantTiersPayant) {
        this.montantTiersPayant = montantTiersPayant;
    }
}
