package rest.service;

import dal.TUser;
import java.util.List;
import org.json.JSONObject;

/**
 * Service de gestion des reserves : listing, mouvements rayon&lt;-&gt;reserve,
 * suggestions de reassort et historique. Remplace l'ancien backend JSP
 * (ws_data / ws_transaction).
 */
public interface ReserveService {

    /**
     * Liste paginee des articles en reserve.
     *
     * @param user        utilisateur courant (fournit l'emplacement)
     * @param search      filtre texte (nom, description, CIP, EAN)
     * @param type        ALL ou REASSORT (articles a reassortir uniquement)
     * @param start       offset de pagination
     * @param limit       taille de page
     */
    JSONObject listArticles(TUser user, String search, String type, int start, int limit);

    /**
     * Liste des articles a reassortir avec quantite suggeree calculee.
     */
    JSONObject suggestions(TUser user, String search, int start, int limit);

    /**
     * Liste des articles a reapprovisionner en reserve (rayon -&gt; reserve)
     * avec quantite suggeree = max(0, stock_rayon - stock_reserve).
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
     * Applique en lot une serie de reassorts dans une seule transaction.
     */
    JSONObject reassortBatch(TUser user, List<JSONObject> items);

    /**
     * Applique en lot une serie d'assorts (rayon -&gt; reserve).
     */
    JSONObject assortBatch(TUser user, List<JSONObject> items);

    /**
     * Historique des mouvements d'un article.
     */
    JSONObject mouvements(String familleId, int start, int limit);

    /**
     * Historique global des mouvements, filtre optionnel par type
     * (ASSORT / REASSORT), classe par date decroissante.
     */
    JSONObject allMouvements(String type, int start, int limit);

    /**
     * Cree un inventaire a partir des articles affiches dans l'onglet courant
     * (selon le filtre type + recherche). Nom : "Inventaire reserve du jj/MM/aaaa".
     */
    JSONObject createInventaire(TUser user, String search, String type);
}
