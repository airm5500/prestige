package rest.service.impl;

/**
 * Taux de marque d'une fiche article : (prix de vente - prix d'achat) / prix de vente, en pour cent entier.
 *
 * Retours des tests du 12/09 (point 2) : la valeur est enregistree sur la fiche a chaque entree en stock qui actualise
 * le prix d'achat, et la fiche l'affiche telle quelle.
 */
public final class TauxMarque {

    private TauxMarque() {
    }

    /**
     * @return le taux en pour cent, arrondi a l'entier, ou null quand l'un des prix manque ou que le prix de vente est
     *         nul (la fiche garde alors sa valeur precedente)
     */
    public static Integer calculer(Integer prixVente, Integer prixAchat) {
        if (prixVente == null || prixAchat == null || prixVente <= 0 || prixAchat < 0) {
            return null;
        }
        return (int) Math.round((prixVente - prixAchat) * 100.0 / prixVente);
    }
}
