package rest.service;

import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Gestion des suggestions de reserve : une suggestion est un objet metier persistant et auditable, de sa creation a sa
 * cloture.
 *
 * <p>
 * Le traitement se fait en DEUX TEMPS. On saisit d'abord les quantites retenues, sans qu'aucun stock ne bouge, puis on
 * declenche le traitement qui execute les mouvements et rend un compte rendu ligne par ligne. La quantite proposee par
 * le systeme reste figee : seule la quantite retenue est modifiable, et l'ecart reste donc visible.
 */
@Local
public interface SuggestionReserveService {

    /**
     * Motifs disponibles, eventuellement restreints a un sens de mouvement.
     *
     * @param categorie
     *            RAYON, RESERVE, ou null pour tous
     */
    JSONArray motifs(String categorie);

    /**
     * Cree une suggestion a partir d'une selection de produits.
     *
     * <p>
     * La quantite proposee est TOUJOURS recalculee par le serveur : une quantite transmise par l'appelant est
     * enregistree comme quantite retenue, jamais comme proposition. L'audit reste ainsi fiable meme si l'ecran a
     * modifie les valeurs avant l'envoi.
     *
     * @param items
     *            lignes {@code {lg_FAMILLE_ID, int_QTE}}, {@code int_QTE} facultative
     */
    JSONObject creer(TUser user, String categorie, Integer motifId, String commentaire, List<JSONObject> items);

    /** Liste paginee des suggestions, avec tous les filtres de recherche et le tri demande. */
    JSONObject lister(TUser user, String statut, String categorie, String origine, Integer motifId, String search,
            String dtStart, String dtEnd, String userId, String tri, int start, int limit);

    /** En-tete et lignes d'une suggestion, avec l'explication de chaque proposition et le stock actuel. */
    JSONObject detail(TUser user, String suggestionId);

    /**
     * Enregistre la quantite retenue d'une ligne. Aucun stock ne bouge a ce stade.
     *
     * <p>
     * Une quantite de zero retire la ligne de la suggestion et trace la suppression, conformement au parcours de
     * saisie au clavier.
     */
    JSONObject majQuantiteRetenue(TUser user, String detailId, int qte, String motif);

    /** Retire une ligne de la suggestion, en conservant la trace de la suppression et son motif. */
    JSONObject supprimerLigne(TUser user, String detailId, String motif);

    /**
     * Supprime une suggestion. Refuse des qu'une ligne a deja ete traitee : un mouvement de stock execute ne doit
     * jamais pouvoir etre masque par une suppression.
     */
    JSONObject supprimerSuggestion(TUser user, String suggestionId, String motif);

    /**
     * Execute les mouvements de toutes les lignes retenues et renvoie le compte rendu detaille : totaux, liste des
     * articles traites, liste des non traites, et pour chaque echec un code et un message exploitables.
     */
    JSONObject traiter(TUser user, String suggestionId);

    /** Rejoue uniquement les lignes en echec, sans retoucher aux lignes deja traitees avec succes. */
    JSONObject reessayerEchecs(TUser user, String suggestionId);

    /**
     * Traite UNE ligne dans sa propre transaction.
     *
     * <p>
     * Expose sur l'interface uniquement pour etre appelee via le proxy du bean : c'est ce qui garantit qu'une ligne en
     * echec n'annule pas les lignes deja passees. Ne pas appeler directement depuis l'exterieur.
     */
    JSONObject traiterLigneIsolee(TUser user, String detailId);

    /** Relit le compte rendu d'une suggestion deja traitee, pour affichage, export ou impression. */
    JSONObject compteRendu(TUser user, String suggestionId);
}
