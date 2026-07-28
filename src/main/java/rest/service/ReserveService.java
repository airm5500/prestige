package rest.service;

import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 *
 * @author Hermann N'ZI
 */
/**
 * Service de gestion des reserves : listing, mouvements rayon&lt;-&gt;reserve, suggestions de reassort et historique.
 * Remplace l'ancien backend JSP (ws_data / ws_transaction).
 *
 * <p>
 * Interface locale declaree explicitement : elle est resolue par
 * {@code SessionContext.getBusinessObject(ReserveService.class)} pour executer chaque ligne d'un lot dans sa propre
 * transaction (REQUIRES_NEW).
 */
@Local
public interface ReserveService {

    /**
     * Liste paginee des articles en reserve.
     *
     * @param user
     *            utilisateur courant (fournit l'emplacement)
     * @param search
     *            filtre texte (nom, description, CIP, EAN)
     * @param type
     *            ALL ou REASSORT (articles a reassortir uniquement)
     * @param start
     *            offset de pagination
     * @param limit
     *            taille de page
     */
    JSONObject listArticles(TUser user, String search, String type, int start, int limit);

    /**
     * Liste des articles a reassortir avec quantite suggeree calculee.
     */
    JSONObject suggestions(TUser user, String search, int start, int limit);

    /**
     * Nombre d'articles a reassortir uniquement (une seule requete) : utilise par le badge de la cloche de
     * notifications, qui n'a pas besoin de la liste detaillee.
     */
    long suggestionsCount(TUser user, String search);

    /**
     * Liste des articles a reapprovisionner en reserve (rayon -&gt; reserve) avec quantite suggeree = max(0,
     * stock_rayon - stock_reserve).
     */
    JSONObject suggestionsReappro(TUser user, String search, int start, int limit);

    /**
     * Deplace une quantite du rayon vers la reserve (operation atomique).
     */
    JSONObject assort(TUser user, String familleId, int qte);

    /**
     * Deplace une quantite de la reserve vers le rayon (operation atomique).
     */
    JSONObject reassort(TUser user, String familleId, int qte);

    /**
     * Applique en lot une serie de reassorts (reserve -&gt; rayon). Chaque ligne est traitee dans sa PROPRE transaction :
     * une ligne en echec n'annule pas les lignes deja passees. Le detail ligne par ligne est retourne dans
     * {@code details}, avec un {@code code} d'echec exploitable.
     */
    JSONObject reassortBatch(TUser user, List<JSONObject> items);

    /**
     * Applique en lot une serie d'assorts (rayon -&gt; reserve). Meme garantie d'isolation par ligne que
     * {@link #reassortBatch}.
     */
    JSONObject assortBatch(TUser user, List<JSONObject> items);

    /**
     * Ajuste le stock RESERVE d'un produit, sans toucher au stock rayon.
     *
     * <p>
     * Destine a l'ajustement de stock lorsque la zone ciblee est la reserve. La ligne est verrouillee, le stock ne
     * peut pas devenir negatif, et le mouvement est trace dans l'historique de reserve au meme titre qu'un
     * reappro : un ajustement de reserve reste donc visible et auditable.
     *
     * <p>
     * REJOINT la transaction de l'appelant : l'ajustement et sa trace sont valides ou annules ensemble.
     *
     * @param delta
     *            quantite a ajouter (positive) ou a retirer (negative)
     */
    JSONObject ajusterReserve(TUser user, String familleId, int delta, String motif);

    /** Nom du privilege requis pour annuler un mouvement de reserve. */
    String PRIVILEGE_ANNULATION = "P_ANNULER_MOUVEMENT_RESERVE";

    /** Indique si l'utilisateur detient le privilege d'annulation, pour masquer l'action a l'ecran. */
    boolean peutAnnuler(TUser user);

    /**
     * Annule un mouvement en creant le mouvement INVERSE de meme quantite.
     *
     * <p>
     * L'historique n'est jamais retouche : le mouvement initial reste en base, le mouvement inverse s'y ajoute en
     * pointant vers lui, avec son auteur, sa date et son motif.
     *
     * <p>
     * L'annulation est refusee, avec un motif explicite, si le privilege manque, si le mouvement a deja ete annule, ou
     * si la zone qui devient source n'a pas le stock necessaire. Le controle du stock est celui des mouvements
     * ordinaires : une annulation ne peut pas davantage rendre un stock negatif.
     */
    JSONObject annulerMouvement(TUser user, String mouvementId, String motif);

    /**
     * Historique complet des mouvements, avec l'ensemble des filtres de recherche.
     *
     * <p>
     * L'historique est immuable : un mouvement execute n'est jamais supprime ni retouche. Une erreur se corrige par un
     * mouvement inverse, qui vient s'ajouter a la suite.
     *
     * @param heureDebut
     *            heure de debut dans la journee (0 a 23), ou null
     * @param heureFin
     *            heure de fin dans la journee (0 a 23), ou null
     * @param annulation
     *            {@code ANNULATION} pour les seuls mouvements qui en defont un autre, {@code ANNULE} pour ceux qui ont
     *            ete defaits, {@code NORMAL} pour les mouvements sans annulation, {@code null} pour tout voir
     */
    JSONObject historique(TUser user, String search, String type, String dtStart, String dtEnd, Integer heureDebut,
            Integer heureFin, String userId, String annulation, int start, int limit);

    /** Export Excel de l'historique, respectant exactement les filtres actifs. */
    byte[] exportHistoriqueExcel(TUser user, String search, String type, String dtStart, String dtEnd,
            Integer heureDebut, Integer heureFin, String userId, String annulation) throws java.io.IOException;

    /**
     * Produits distincts apparaissant dans l'historique filtre.
     *
     * <p>
     * Sert a creer un inventaire sur ce que l'ecran affiche reellement, et non sur toute la reserve : c'est le
     * resultat de recherche qui definit le perimetre.
     */
    JSONObject produitsHistorique(TUser user, String search, String type, String dtStart, String dtEnd,
            Integer heureDebut, Integer heureFin, String userId, String annulation, int start, int limit);

    /**
     * Construit la fiche JSON d'une liste de produits (code, designation, stocks rayon et reserve, prix), en deux
     * requetes pour tout le lot.
     *
     * <p>
     * Expose pour que les autres ecrans puissent proposer une selection de produits sans reconstruire eux-memes la
     * lecture des stocks.
     */
    JSONArray articlesJson(java.util.List<String> familleIds, TUser user);

    /**
     * Recherche de produits pour un ajustement de la RESERVE.
     *
     * <p>
     * Rend la meme forme que la recherche de la vente, mais {@code intNUMBERAVAILABLE} y porte le stock RESERVE et non
     * le stock rayon : la liste deroulante affiche donc le stock de la zone reellement ajustee. Seuls les produits
     * suivis en reserve sont proposes, les autres n'ayant pas de stock reserve a corriger.
     */
    JSONObject rechercheProduitsReserve(TUser user, String query, int start, int limit);

    /** Utilisateurs ayant effectue au moins un mouvement, pour alimenter le filtre correspondant. */
    JSONArray utilisateursMouvements(TUser user);

    /**
     * Deplacement rayon&lt;-&gt;reserve qui REJOINT la transaction de l'appelant, au lieu d'ouvrir la sienne.
     *
     * <p>
     * Destine au traitement d'une suggestion : le mouvement de stock et la mise a jour de la ligne de suggestion
     * doivent etre valides ensemble. Sans cela, une ecriture de ligne en echec apres un mouvement reussi laisserait la
     * ligne rejouable, et le stock pourrait etre deplace deux fois.
     *
     * @param categorie
     *            RAYON (reserve -&gt; rayon) ou RESERVE (rayon -&gt; reserve)
     */
    JSONObject deplacer(TUser user, String familleId, int qte, String categorie);

    /**
     * Proposition de mouvement pour UN produit et un sens donne, accompagnee de son explication.
     *
     * <p>
     * Source de verite unique du calcul : le service de suggestions l'appelle au lieu de reecrire la formule, ce qui
     * garantit que la quantite persistee est celle qu'affichent les ecrans.
     *
     * @param categorie
     *            RAYON (reserve -&gt; rayon) ou RESERVE (rayon -&gt; reserve)
     *
     * @return {@code {declencheur, int_STOCK_RAYON, int_STOCK_RESERVE, int_SEUIL_DECLENCHEUR, int_CIBLE,
     *         int_DISPONIBLE, int_PROPOSITION, str_FORMULE}}, ou {@code null} si le produit est introuvable
     */
    JSONObject proposition(TUser user, String familleId, String categorie);

    /**
     * Stock actuellement en reserve pour un produit, dans l'emplacement de l'utilisateur.
     *
     * <p>
     * Utile a tout ecran qui doit afficher ou controler le stock reserve sans avoir a reconstruire une proposition.
     * Renvoie zero si le produit n'est pas suivi en reserve.
     */
    int stockReserve(TUser user, String familleId);

    /**
     * Export Excel de la liste des articles de l'onglet courant. Les donnees sont produites par
     * {@link #listArticles} : les chiffres exportes sont donc rigoureusement ceux affiches a l'ecran, filtres compris.
     *
     * @param type
     *            ALL, REAPPRO ou REASSORT_RAYON (meme valeur que l'onglet affiche)
     *
     * @return contenu du classeur, ou un tableau vide s'il n'y a aucune ligne
     */
    byte[] exportExcel(TUser user, String search, String type) throws java.io.IOException;

    /**
     * Historique des mouvements d'un article, avec filtre periode optionnel.
     */
    JSONObject mouvements(String familleId, String dtStart, String dtEnd, int start, int limit);

    /**
     * Historique global des mouvements, filtre optionnel par type et periode, classe par date decroissante.
     */
    /**
     * Mouvements de reserve, tous produits confondus.
     *
     * @param search
     *            nom ou code CIP du produit, facultatif
     */
    JSONObject allMouvements(String type, String dtStart, String dtEnd, String search, int start, int limit);

    /**
     * Cree un inventaire a partir des articles affiches dans l'onglet courant (selon le filtre type + recherche). Nom :
     * "Inventaire reserve du jj/MM/aaaa".
     */
    JSONObject createInventaire(TUser user, String search, String type);

    /**
     * Cree un inventaire reserve a partir d'une liste d'ids selectionnes par l'utilisateur, avec un commentaire
     * optionnel place dans str_DESCRIPTION. Nom : "Inventaire reserve du jj/MM/aaaa HH:mm".
     */
    JSONObject createInventaireFromSelection(TUser user, java.util.Set<String> ids, String commentaire);

    /**
     * Variante permettant d'imposer le nom (titre) de l'inventaire cree (ex. "Inventaire unites gratuites du ..."). Si
     * titre est vide/null, on retombe sur le nom par defaut "Inventaire reserve du ...".
     */
    JSONObject createInventaireFromSelection(TUser user, java.util.Set<String> ids, String commentaire, String titre);
}
