package rest.service.impl;

/**
 * Plan du 12/11 (« Modifier Article » d'un BL) : regles de calcul de la modification des prix d'une ligne, reprises de
 * l'ancien traitement (bonLivraisonManagement.changePrice, hors service depuis le 18/10).
 */
public final class PrixLigneBl {

    private PrixLigneBl() {
    }

    /**
     * Montant du bon apres changement du prix d'achat facture d'une ligne : la part de la ligne (PAF x quantite
     * commandee) est retiree a l'ancien prix et remise au nouveau. Valable pour le HT comme pour le TTC (la TVA du bon
     * ne change pas).
     */
    public static int montantApres(int montant, int ancienPaf, int nouveauPaf, int quantiteCommandee) {
        return montant - ancienPaf * quantiteCommandee + nouveauPaf * quantiteCommandee;
    }

    /** Message de refus d'une saisie (null si elle est acceptable) : quatre prix entiers, aucun negatif. */
    public static String refus(Integer prixVente, Integer prixTips, Integer paf, Integer paTarif) {
        Integer[] prix = { prixVente, prixTips, paf, paTarif };
        for (Integer p : prix) {
            if (p == null) {
                return "Les quatre prix sont obligatoires.";
            }
            if (p < 0) {
                return "Un prix ne peut pas être négatif.";
            }
        }
        return null;
    }
}
