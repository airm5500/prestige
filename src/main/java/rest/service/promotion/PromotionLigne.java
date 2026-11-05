package rest.service.promotion;

/**
 * Audit 05 PR-01 : regles de calcul d'une ligne de vente en promotion, sans acces a la base (testees par
 * PromotionLigneCoherenceTest).
 * <ul>
 * <li>REMISE, PRIX SPECIAL : prix unitaire promotionnel, applique seulement s'il est inferieur au prix de la ligne
 * ;</li>
 * <li>UNITES GRATUITES (n offertes a partir de s) : apres s boites payees, les n suivantes ne le sont pas, et ainsi de
 * suite ; elles restent dans la quantite de la ligne.</li>
 * </ul>
 */
public final class PromotionLigne {

    public static final String REMISE = "REMISE";
    public static final String PRIX_SPECIAL = "PRIX SPECIAL";
    public static final String UNITES_GRATUITES = "UNITES GRATUITES";

    private PromotionLigne() {
    }

    /**
     * Prix unitaire promotionnel d'une ligne, ou {@code null} si la promotion ne baisse pas le prix (unites gratuites,
     * prix promotionnel absent ou pas inferieur au prix de la ligne).
     *
     * @param type
     *            type de la promotion
     * @param remise
     *            remise en % (promotion REMISE)
     * @param prixPromotion
     *            prix promotionnel enregistre avec la promotion
     * @param prixLigne
     *            prix unitaire de la ligne avant promotion
     */
    public static Integer prixUnitaire(String type, Integer remise, Double prixPromotion, Integer prixLigne) {
        if (UNITES_GRATUITES.equals(type) || prixLigne == null) {
            return null;
        }
        int prix;
        if (REMISE.equals(type) && remise != null && remise > 0 && remise < 100) {
            // le pourcentage s'applique au prix du jour : le prix enregistre a la creation suit l'ancien prix public
            prix = (int) Math.round(prixLigne * (100 - remise) / 100.0);
        } else {
            prix = prixPromotion != null ? (int) Math.round(prixPromotion) : 0;
        }
        return prix > 0 && prix < prixLigne ? prix : null;
    }

    /**
     * Unites offertes sur une ligne de {@code quantite} boites : apres s boites payees, les n suivantes sont offertes,
     * et ainsi de suite. Les boites au-dela de s dans un groupe incomplet sont donc offertes aussi : une boite de plus
     * ne coute jamais moins cher.
     */
    public static int unitesOffertes(int quantite, Integer seuil, Integer offertes) {
        int s = seuil != null ? seuil : 0;
        int n = offertes != null ? offertes : 0;
        if (s <= 0 || n <= 0 || quantite <= 0) {
            return 0;
        }
        return (quantite / (s + n)) * n + Math.max(0, quantite % (s + n) - s);
    }

    /** Montant de la ligne : unites payees (quantite moins unites offertes) au prix unitaire. */
    public static int montant(int prixUnitaire, int quantite, int offertes) {
        return prixUnitaire * (quantite - offertes);
    }
}
