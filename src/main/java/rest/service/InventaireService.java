package rest.service;

import dal.TUser;
import java.util.List;
import java.util.Set;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.inventaire.dto.DetailInventaireDTO;
import rest.service.inventaire.dto.InventaireDTO;
import rest.service.inventaire.dto.RayonDTO;
import rest.service.inventaire.dto.UpdateInventaireDetailDTO;

/**
 *
 * @author koben
 */
@Local
public interface InventaireService {

    JSONObject createInventaireFromCanceledList(String dtStart, String dtEnd, String userId, TUser tUser);

    List<InventaireDTO> fetch(Integer maxResult);

    List<RayonDTO> fetchRayon(String idInventaire, Integer page, Integer maxResult);

    List<DetailInventaireDTO> fetchDetails(String idInventaire, String idRayon, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsUntouchedRayon(String idInventaire, String idRayon, String query,
            Integer page, Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsTouchedRayon(String idInventaire, String idRayon, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAllTouched(String idInventaire, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAll(String idInventaire, String query, Integer page, Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAllUntouched(String idInventaire, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAllEcarts(String idInventaire, String query, Integer page, Integer maxResult);

    void updateDetailQuantity(UpdateInventaireDetailDTO updateInventaire);

    void refreshStockLigneInventaire(String inventaireId);

    int create(Set<String> produitIds, String description);

    JSONObject createInventaireFromEcarts(String sourceInventaireId, TUser tUser);

    /**
     * Variante du create() generique avec un nom distinct de la description (le nom horodate va dans str_NAME, le
     * commentaire dans str_DESCRIPTION). Operation atomique : en cas d'echec, aucun inventaire partiel n'est cree.
     */
    int create(Set<String> produitIds, String name, String description);

    /**
     * Cree un inventaire de type "reserve" seede depuis t_type_stock_famille (type 2). Isole du create() generique pour
     * ne pas impacter les autres fonctionnalites.
     */
    int createReserveInventaire(Set<String> produitIds, String description);

    /**
     * Variante avec un nom et une description distincts (le commentaire saisi va dans str_DESCRIPTION, le nom horodate
     * reste dans str_NAME).
     */
    int createReserveInventaire(Set<String> produitIds, String name, String description);

    /**
     * Remplace le commentaire (str_DESCRIPTION) d'un inventaire ENCORE EN COURS.
     *
     * <p>
     * Sur un inventaire cloture la demande est refusee : {@code success=false} et un message explicite. Le stock a deja
     * ete applique, le motif enregistre ne doit plus changer.
     */
    org.json.JSONObject updateCommentaire(String inventaireId, String commentaire);

    /**
     * Enregistre la quantite comptee sur une ligne d'inventaire.
     *
     * <p>
     * Remplace le mode {@code updateinventairefamille} de ws_transactions.jsp. Le traitement est le meme : seules la
     * quantite et la date de mise a jour changent. Le retour porte {@code success} (1 ou 0) et, en cas d'echec,
     * {@code errors}, pour que l'ecran de saisie reagisse comme avant.
     */
    org.json.JSONObject updateQuantiteLigne(Long ligneId, Integer quantite);

    /**
     * Retire une ligne d'un inventaire. Remplace le mode {@code deleteInventaireFamille} de ws_transactions.jsp.
     *
     * <p>
     * Le retour porte {@code success} et {@code errors}, les deux champs que l'ecran lit deja.
     */
    org.json.JSONObject supprimerLigne(Long ligneId);

    /**
     * Retient ou ecarte une ligne d'un inventaire unitaire.
     *
     * <p>
     * Remplace le mode {@code updateInventaireUnitaireFamille} de ws_transactions.jsp. Sur un inventaire unitaire,
     * toutes les lignes existent des la creation mais ne sont pas retenues ; cocher une ligne la fait entrer dans
     * l'inventaire, la decocher l'en sort. Seul {@code bool_INVENTAIRE} change.
     */
    org.json.JSONObject retenirLigne(Long ligneId, boolean retenue);

    /**
     * Valeurs disponibles pour un filtre de la fiche d'inventaire.
     *
     * <p>
     * Les listes sont CADREES SUR L'INVENTAIRE : un inventaire cree sur trois emplacements ne propose que ces trois
     * emplacements, jamais la totalite du referentiel. Idem pour les familles et les grossistes.
     *
     * @param axe
     *            ZONE, FAMILLE, GROSSISTE ou UTILISATEUR
     */
    org.json.JSONObject criteresInventaire(String inventaireId, String axe, String recherche);

    /**
     * Meme traitement que {@link #createReserveInventaire(Set, String, String)}, mais rend compte du detail.
     *
     * <p>
     * Le retour porte {@code count} (produits reellement inventories) et {@code ignores}, un tableau d'objets
     * {@code {lg_FAMILLE_ID, int_CIP, str_NAME, motif}} decrivant chaque produit ecarte. Un produit ecarte n'interrompt
     * pas la creation : l'inventaire est cree avec les autres, et l'ecran affiche la liste des exclusions.
     */
    org.json.JSONObject createReserveInventaireDetaille(Set<String> produitIds, String name, String description);

    JSONObject createInventaireFromCsv(String csvContent, TUser tUser);

    /** Ids produits distincts contenus dans les ventes donnees (ex: ventes annulees selectionnees). */
    Set<String> produitIdsFromVentes(List<String> venteIds);

    /**
     * Export Excel des produits d'un inventaire avec tous les champs (CIP, designation, emplacement, stock machine,
     * stock saisi, ecart, prix, valeur d'ecart, comptage). Utilisable a tout moment, y compris apres cloture.
     */
    byte[] exportInventaireExcel(String inventaireId) throws java.io.IOException;
}
