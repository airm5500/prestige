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

    JSONObject createInventaireFromCsv(String csvContent, TUser tUser);

    /** Ids produits distincts contenus dans les ventes donnees (ex: ventes annulees selectionnees). */
    Set<String> produitIdsFromVentes(List<String> venteIds);
}
