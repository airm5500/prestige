package rest.service.suggestion;

/**
 * Regle unique du seuil des suggestions de commande : le stock compare au seuil, quand un produit entre dans une
 * suggestion, et quand « Nettoyer la suggestion » l'en retire (plan du 08/11, point 11.2).
 *
 * <p>
 * Le stock compare est le rayon, plus la reserve quand le produit y est gere (case « reserve » de la fiche). L'option
 * {@code KEY_OPTION_SUGGESTION} dit quand le produit entre : stock « = », « < » ou « <= » au seuil.
 */
public final class RegleSeuilSuggestion {

    private RegleSeuilSuggestion() {
    }

    /** Stock compare au seuil : rayon, plus la reserve si le produit est gere en reserve. */
    public static int stockACommander(int rayon, int reserve, boolean gereEnReserve) {
        return gereEnReserve ? rayon + Math.max(0, reserve) : rayon;
    }

    /** Le produit entre dans une suggestion. */
    public static boolean declenche(int stock, int seuil, String option) {
        if ("=".equals(option)) {
            return stock == seuil;
        }
        if ("<".equals(option)) {
            return stock < seuil;
        }
        return stock <= seuil;
    }

    /** « Nettoyer la suggestion » retire le produit. */
    public static boolean aRetirer(int rayon, int reserve, boolean gereEnReserve, int seuil, String option) {
        int stock = stockACommander(rayon, reserve, gereEnReserve);
        if ("<".equals(option)) {
            // le produit n'entre que sous le seuil : au seuil, il n'a plus rien a faire dans la suggestion
            return stock >= seuil;
        }
        // « <= » : inverse exact de l'entree ; « = » : seul le depassement retire (sous le seuil, il reste a commander)
        return stock > seuil;
    }
}
