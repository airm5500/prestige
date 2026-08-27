package rest.service;

import javax.ejb.Local;

/**
 * Diagnostic des suggestions lentes a l'ouverture.
 *
 * <p>
 * Appele par le filtre qui mesure les appels de l'API : quand un appel de l'ecran des suggestions depasse le seuil de
 * lenteur, on cherche la cause connue (lignes de vente en double, index manquant) et on depose dans le Centre de
 * support un evenement portant le constat et le script a executer.
 */
@Local
public interface SuggestionLenteurService {

    /**
     * Diagnostique une ouverture de suggestion jugee lente, et depose le rapport dans le Centre de support.
     *
     * <p>
     * Traitement asynchrone et « au mieux » : il ne rend jamais la main en erreur et n'a aucun effet sur l'appel qui
     * l'a declenche. Le diagnostic lui-meme est espace dans le temps, la recherche des doublons parcourant toute la
     * table des lignes de vente.
     *
     * @param uri
     *            appel juge lent
     * @param chaineDeRequete
     *            parametres de l'appel, qui portent l'identifiant de la suggestion
     * @param dureeMs
     *            temps de traitement mesure
     * @param seuilMs
     *            seuil au-dela duquel un appel est juge lent
     * @param utilisateur
     *            qui a constate la lenteur
     */
    void diagnostiquer(String uri, String chaineDeRequete, long dureeMs, long seuilMs, String utilisateur);
}
