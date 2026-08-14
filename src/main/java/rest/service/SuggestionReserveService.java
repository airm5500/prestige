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

    /**
     * Liste paginee des suggestions, avec tous les filtres de recherche et le tri demande.
     *
     * @param controle
     *            {@code "O"} pour ne garder que les suggestions controlees, {@code "N"} pour les traitees non encore
     *            controlees, {@code null} pour ne pas filtrer
     */
    JSONObject lister(TUser user, String statut, String categorie, String origine, Integer motifId, String search,
            String dtStart, String dtEnd, String userId, String controle, String tri, int start, int limit);

    /**
     * Confirme qu'une suggestion traitee a bien ete realisee sur le terrain.
     *
     * <p>
     * Le traitement deplace le stock dans le systeme ; le controle atteste que le deplacement physique a reellement eu
     * lieu. Il n'est donc possible que sur une suggestion TRAITEE, et une seule fois : un controle deja pose n'est pas
     * remplace, sans quoi la trace du premier controleur serait perdue.
     *
     * @param observation
     *            constat facultatif du controleur
     */
    JSONObject controler(TUser user, String suggestionId, String observation);

    /**
     * Suggestions restant a traiter dans l'emplacement de l'utilisateur, pour la cloche de notifications.
     *
     * <p>
     * La cloche annonce des SUGGESTIONS et non plus des produits : un chiffre y correspond a un dossier a ouvrir.
     */
    JSONArray suggestionsEnAttente(TUser user, int limit);

    /** Compteur seul, pour le badge : une requete de comptage, sans construire la liste. */
    long compterSuggestionsEnAttente(TUser user);

    /**
     * Produits distincts contenus dans les suggestions correspondant aux filtres, ou dans une selection precise.
     *
     * <p>
     * Sert a creer un inventaire sur ce que l'ecran affiche reellement. Si {@code ids} est renseigne, seules ces
     * suggestions sont prises en compte et les filtres sont ignores.
     */
    JSONObject produitsDesSuggestions(TUser user, List<String> ids, String statut, String categorie, String origine,
            Integer motifId, String search, String dtStart, String dtEnd, String userId, String controle, int start,
            int limit);

    /** En-tete et lignes d'une suggestion, avec l'explication de chaque proposition et le stock actuel. */
    JSONObject detail(TUser user, String suggestionId);

    /**
     * Prend la suggestion pour la traiter, si personne d'autre ne l'occupe.
     *
     * <p>
     * Deux personnes ne doivent pas saisir les quantites d'une meme suggestion en meme temps : leurs saisies
     * s'ecraseraient mutuellement sans que ni l'une ni l'autre s'en apercoive. Tant qu'une personne l'occupe, les
     * autres peuvent la CONSULTER mais pas la modifier, et sont averties de qui la detient.
     *
     * <p>
     * Un poste ferme brutalement ne condamne pas la suggestion : passe un delai d'inactivite, le verrou est considere
     * comme perime et repris automatiquement.
     *
     * @return le detail habituel, enrichi de {@code verrou_par}, {@code verrou_depuis} et {@code modifiable}
     */
    JSONObject ouvrirPourTraitement(TUser user, String suggestionId);

    /** Rend la suggestion disponible pour les autres. Sans effet si elle est occupee par quelqu'un d'autre. */
    JSONObject libererVerrou(TUser user, String suggestionId);

    /**
     * Enregistre la quantite retenue d'une ligne. Aucun stock ne bouge a ce stade.
     *
     * <p>
     * Une quantite de zero retire la ligne de la suggestion et trace la suppression, conformement au parcours de saisie
     * au clavier.
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

    /**
     * Controles prealables au traitement, dans sa propre transaction : verrou, statut, et liste des lignes a traiter.
     *
     * <p>
     * Expose pour l'appel via le proxy du bean. Doit etre VALIDE avant que les lignes ne soient traitees, sans quoi la
     * relecture finale ne verrait pas leurs modifications.
     */
    JSONObject preparerTraitement(TUser user, String suggestionId, boolean seulementEchecs);

    /**
     * Recalcule le statut puis rend le compte rendu, dans une transaction NEUVE.
     *
     * <p>
     * Indispensable : la base travaille en lecture repetable, une transaction ouverte avant le traitement continuerait
     * de voir les lignes telles qu'elles etaient AVANT, et compterait comme ignoree une ligne pourtant deplacee.
     */
    JSONObject finaliserEtCompteRendu(TUser user, String suggestionId);

    /** Controles prealables a l'annulation et liste des lignes annulables, dans sa propre transaction. */
    JSONObject preparerAnnulation(TUser user, String suggestionId);

    /** Recalcule le statut apres annulation, dans une transaction neuve. Meme raison qu'au traitement. */
    void finaliserAnnulation(TUser user, String suggestionId);

    /** Relit le compte rendu d'une suggestion deja traitee, pour affichage, export ou impression. */
    JSONObject compteRendu(TUser user, String suggestionId);

    /**
     * Export Excel du compte rendu : en-tete de la suggestion (reference, statut, motif, dates, createur et cloturant)
     * puis le detail ligne par ligne, echecs compris.
     */
    byte[] exportCompteRenduExcel(TUser user, String suggestionId) throws java.io.IOException;

    /**
     * Export Excel (paysage) du rapport d'importation du panier de reappro : les lignes non prises en compte telles
     * quelles (rejets et quantites ajustees). Le payload est le rapport affiche a l'ecran, envoye par le client :
     * {@code {categorie, resume, lignes:[{ligne, cip, designation, quantite, stock, motif, type}]}}. La colonne stock
     * porte le stock de l'autre cote du mouvement : stock rayon en reappro reserve, stock reserve en reappro rayon.
     */
    byte[] exportRapportImportExcel(TUser user, String payload) throws java.io.IOException;

    /**
     * PDF (JasperReports, A4 paysage) du meme rapport d'importation, pour impression. Modele
     * {@code rp_rapport_import_reappro.jrxml} : la copie du dossier des modeles est prioritaire, le modele embarque
     * dans le war sert de repli. Les donnees viennent du payload (datasource memoire, aucune requete base).
     */
    byte[] exportRapportImportPdf(TUser user, String payload) throws Exception;

    /**
     * Evalue un produit apres un mouvement ayant modifie son stock rayon, et rattache le cas echeant une ligne a la
     * suggestion automatique ouverte.
     *
     * <p>
     * Les DEUX sens sont examines, ce sont les donnees qui decident : un rayon retombe sous son seuil mini appelle un
     * reappro depuis la reserve, un rayon au-dessus du seuil reserve appelle un rangement en reserve. Une vente
     * declenche donc le premier cas, une entree en stock le second, sans que l'appelant ait a le savoir.
     *
     * <p>
     * A APPELER APRES VALIDATION DU STOCK. La methode s'execute dans sa propre transaction et ne verrait pas des
     * ecritures non encore validees.
     *
     * <p>
     * Ne leve jamais : un incident de suggestion ne doit jamais faire echouer une vente ni une entree en stock.
     */
    void evaluerApresMouvement(TUser user, String familleId);

    /** Variante pour plusieurs produits, typiquement a la cloture d'un bon de livraison. */
    void evaluerApresMouvementLot(TUser user, java.util.Collection<String> familleIds);

    /**
     * Cree une suggestion portant sur TOUS les articles d'un resultat de recherche, et non sur une selection.
     *
     * <p>
     * Le serveur rejoue la meme recherche que la grille : la suggestion couvre donc exactement les lignes affichees,
     * pagination comprise, sans que l'ecran ait a les transmettre.
     *
     * @param type
     *            ALL, REAPPRO ou REASSORT_RAYON, comme l'onglet d'ou part la demande
     */
    JSONObject creerDepuisRecherche(TUser user, String type, String search, Integer motifId, String commentaire);

    /**
     * Cree un inventaire reserve portant sur les produits d'une suggestion, hors lignes retirees.
     */
    JSONObject creerInventaire(TUser user, String suggestionId);

    /**
     * Annule UNE ligne deja traitee, par mouvement inverse. Permet de defaire un seul produit parmi plusieurs.
     */
    JSONObject annulerLigne(TUser user, String detailId, String motif);

    /**
     * Annule toutes les lignes traitees d'une suggestion, par mouvements inverses.
     *
     * <p>
     * Les lignes encore annulables et celles qui ne le sont pas sont traitees separement : chaque refus est explique
     * individuellement, sans empecher les autres lignes d'aboutir.
     */
    JSONObject annulerSuggestion(TUser user, String suggestionId, String motif);

    /**
     * Annule UNE ligne dans sa propre transaction. Expose pour l'appel via le proxy du bean, comme le traitement.
     */
    JSONObject annulerLigneIsolee(TUser user, String detailId, String motif);

    /**
     * Programme l'evaluation d'un produit pour qu'elle s'execute UNE FOIS LA VENTE VALIDEE.
     *
     * <p>
     * Le flux de vente est en transaction geree par le conteneur : il n'offre aucun point apres validation. On
     * s'inscrit donc sur la transaction en cours, et l'evaluation se declenche a sa cloture, quand le stock est
     * definitif. Sans cela, la vente qui fait franchir le seuil ne serait pas vue et le declenchement aurait une vente
     * de retard.
     *
     * <p>
     * Les produits d'une meme vente sont regroupes : une seule evaluation pour l'ensemble du ticket.
     *
     * <p>
     * L'inscription ne touche pas la base et ne leve jamais. L'evaluation, elle, se declenche alors que la vente est
     * DEJA VALIDEE : elle ne peut donc structurellement pas la remettre en cause.
     */
    void planifierEvaluationApresVente(TUser user, String familleId);

    /**
     * Evaluation declenchee apres validation d'une vente, soumise au parametre d'activation.
     *
     * <p>
     * Usage interne, appelee par le mecanisme ci-dessus. Positionner le parametre {@code SUGGESTION_RESERVE_HOOK_VENTE}
     * a {@code 0} desactive ce declenchement sans redeploiement.
     */
    void evaluerApresVente(TUser user, java.util.Collection<String> familleIds);
}
