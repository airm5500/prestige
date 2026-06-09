package rest.service;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface SearchProduitServcie {

    JSONObject fetchProduits(List<TPrivilege> usersPrivileges, TUser user, String produitId, String search,
            String diciId, String type, String zoneGeoId, String stockOperator, String stockValue, int limit,
            int start);

    JSONObject fetchOrderProduits(TUser user, String produitId, String search, int limit, int start);

    JSONObject fetchOne(List<TPrivilege> usersPrivileges, TUser user, String produitId);

    /**
     * Retourne les ids (lg_FAMILLE_ID) de tous les produits correspondant aux filtres de la fiche article (sans
     * pagination). Si onlyReserve = true, restreint aux produits ayant bool_RESERVE = 1.
     */
    List<String> fetchProduitIds(TUser user, String search, String diciId, String type, String zoneGeoId,
            String stockOperator, String stockValue, boolean onlyReserve);
}
