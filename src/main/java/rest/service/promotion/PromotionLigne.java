package rest.service.promotion;

/**
 * Audit 05 PR-01 : regles de calcul d'une ligne de vente en promotion, sans acces a la base (testees par
 * PromotionLigneCoherenceTest).
 * <ul>
 * <li>REMISE, PRIX SPECIAL : prix unitaire promotionnel, applique seulement s'il est inferieur au prix de la ligne
 * ;</li>
 * <li>UNITES GRATUITES « a partir de s » : apres s boites payees, les n suivantes ne le sont pas, une seule fois ;
 * elles restent dans la quantite de la ligne ;</li>
 * <li>UNITES GRATUITES « par palier de s » : n offertes par palier de s boites payees, ajoutees a la ligne.</li>
 * </ul>
 */
public final class PromotionLigne {

    public static final String REMISE = "REMISE";
    public static final String PRIX_SPECIAL = "PRIX SPECIAL";
    public static final String UNITES_GRATUITES = "UNITES GRATUITES";
    /** Unites gratuites « a partir de s » : n offertes une seule fois, comprises dans la quantite de la ligne. */
    public static final String MODE_A_PARTIR = "A_PARTIR";
    /** Unites gratuites « par palier de s » (demande du 07/11) : n offertes par palier de s payees, en plus. */
    public static final String MODE_PALIER = "PALIER";

    public static boolean palier(String mode) {
        return MODE_PALIER.equals(mode);
    }

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
     * « A partir de s » : unites offertes sur une ligne de {@code quantite} boites : apres s boites payees, les n
     * suivantes sont offertes, UNE SEULE FOIS (choix du 07/11 : la repetition est l'option « par palier ») ; les
     * suivantes sont payees. Une boite de plus ne coute donc jamais moins cher.
     */
    public static int unitesOffertes(int quantite, Integer seuil, Integer offertes) {
        int s = seuil != null ? seuil : 0;
        int n = offertes != null ? offertes : 0;
        if (s <= 0 || n <= 0 || quantite <= 0) {
            return 0;
        }
        return Math.min(n, Math.max(0, quantite - s));
    }

    /**
     * Par palier de s (demande du 07/11) : n unites offertes par palier complet de s boites PAYEES ; elles s'ajoutent
     * aux boites payees (9 payees par palier de 4, 1 offerte : 2 offertes, 11 boites).
     */
    public static int offertesParPalier(int payees, Integer seuil, Integer offertes) {
        int s = seuil != null ? seuil : 0;
        int n = offertes != null ? offertes : 0;
        if (s <= 0 || n <= 0 || payees <= 0) {
            return 0;
        }
        return (payees / s) * n;
    }

    /**
     * Mention de la ligne sur le ticket et a l'ecran (plan du 06/11, point 3.2) : « PROMOTION x+n OFFERT(S) », x =
     * boites qui ouvrent droit aux n offertes (5+1 ; 8+2 pour deux paliers de 4) ; « PROMOTION » seul pour un prix ou
     * une remise, ou tant que rien n'est offert. Ligne sans type copie (vendue avant) : l'ancien texte.
     */
    public static String mention(String type, String mode, Integer seuil, Integer gratuites, int offertes) {
        if (type == null) {
            return "PROMOTION" + (offertes > 0 ? " DONT " + offertes + " OFFERTE(S)" : "");
        }
        if (!UNITES_GRATUITES.equals(type) || offertes <= 0 || seuil == null || seuil <= 0 || gratuites == null
                || gratuites <= 0) {
            return "PROMOTION";
        }
        int ouvrent = palier(mode) ? (offertes / gratuites) * seuil : seuil;
        return "PROMOTION " + ouvrent + "+" + offertes + " OFFERT(S)";
    }

    /** Montant de la ligne : unites payees (quantite moins unites offertes) au prix unitaire. */
    public static int montant(int prixUnitaire, int quantite, int offertes) {
        return prixUnitaire * (quantite - offertes);
    }
}
