package rest;

/**
 * Decoupage d'une liste chargee en memoire selon la pagination demandee par l'ecran (start / limit).
 *
 * Les webservices JSP historiques calculaient ce decoupage a partir d'une taille de page fixe cote serveur : quand
 * l'ecran demandait une taille differente (15 lignes alors que le serveur decoupait par 20), la page suivante renvoyait
 * les memes lignes. Cette classe applique exactement ce que l'ecran demande.
 */
public final class PaginationUtil {

    private PaginationUtil() {
    }

    /**
     * Indice de debut (inclus) de la tranche a renvoyer.
     *
     * @param start
     *            indice de la premiere ligne demandee par l'ecran
     * @param taille
     *            nombre total de lignes disponibles
     */
    public static int debut(int start, int taille) {
        if (start <= 0) {
            return 0;
        }
        return Math.min(start, Math.max(taille, 0));
    }

    /**
     * Indice de fin (exclu) de la tranche a renvoyer.
     *
     * @param start
     *            indice de la premiere ligne demandee par l'ecran
     * @param limit
     *            nombre de lignes par page demande par l'ecran (0 ou negatif : tout le reste)
     * @param taille
     *            nombre total de lignes disponibles
     */
    public static int fin(int start, int limit, int taille) {
        int t = Math.max(taille, 0);
        int d = debut(start, t);
        if (limit <= 0) {
            return t;
        }
        return Math.min(d + limit, t);
    }

    /**
     * La tranche de lignes demandee par l'ecran.
     *
     * A utiliser des que les lignes sont construites en memoire (plusieurs requetes par ligne, agregats...) et ne
     * peuvent donc pas etre decoupees par la base.
     *
     * @param lignes
     *            toutes les lignes disponibles
     * @param start
     *            indice de la premiere ligne demandee par l'ecran
     * @param limit
     *            nombre de lignes par page demande par l'ecran (0 ou negatif : tout le reste)
     */
    public static <T> java.util.List<T> tranche(java.util.List<T> lignes, int start, int limit) {
        if (lignes == null || lignes.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return lignes.subList(debut(start, lignes.size()), fin(start, limit, lignes.size()));
    }
}
