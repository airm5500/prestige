package rest.service.dto;

/**
 * Prix et taux de reference d'une ligne de vente pour UN tiers-payant de la vente (cas 2 du 03/11/2026). Quand aucune
 * ligne prix_reference n'existe pour le couple produit x tiers-payant, {@code defaut} vaut vrai : la valeur est le prix
 * de vente de la ligne et le taux celui du tiers-payant pour ce client ; rien n'est ecrit tant que l'utilisateur ne
 * modifie pas une cellule.
 */
public class ReferenceTpDTO {

    private String detailId;
    private String tpId;
    private String compteTpId;
    private String libelle;
    private int valeur;
    private int taux;
    private String type;
    private boolean defaut;
    private String prixReferenceId;
    /**
     * Retour du 10/11/2026 : vrai si cet organisme passe en premier sur la ligne et prend 100 % de sa base (prise en
     * charge totale confirmee a la caisse) ; le taux affiche vaut alors 100.
     */
    private boolean premier;

    public boolean isPremier() {
        return premier;
    }

    public void setPremier(boolean premier) {
        this.premier = premier;
    }

    public String getDetailId() {
        return detailId;
    }

    public void setDetailId(String detailId) {
        this.detailId = detailId;
    }

    public String getTpId() {
        return tpId;
    }

    public void setTpId(String tpId) {
        this.tpId = tpId;
    }

    public String getCompteTpId() {
        return compteTpId;
    }

    public void setCompteTpId(String compteTpId) {
        this.compteTpId = compteTpId;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public int getValeur() {
        return valeur;
    }

    public void setValeur(int valeur) {
        this.valeur = valeur;
    }

    public int getTaux() {
        return taux;
    }

    public void setTaux(int taux) {
        this.taux = taux;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean isDefaut() {
        return defaut;
    }

    public void setDefaut(boolean defaut) {
        this.defaut = defaut;
    }

    public String getPrixReferenceId() {
        return prixReferenceId;
    }

    public void setPrixReferenceId(String prixReferenceId) {
        this.prixReferenceId = prixReferenceId;
    }
}
