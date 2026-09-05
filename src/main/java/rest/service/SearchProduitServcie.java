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
            String diciId, String type, String zoneGeoId, String stockOperator, String stockValue, String tvaId,
            int limit, int start);

    JSONObject fetchOrderProduits(TUser user, String produitId, String search, int limit, int start);

    JSONObject fetchOne(List<TPrivilege> usersPrivileges, TUser user, String produitId);

    /**
     * Indicateurs de la fiche article calcules sur TOUT le resultat filtre, et non sur la page affichee : nombre
     * d'articles, articles en rupture (stock total <= 0), articles sous le seuil de reapprovisionnement et valeur du
     * stock au prix d'achat. Les criteres sont exactement ceux de la liste.
     */
    org.json.JSONObject kpiFiche(TUser user, String search, String diciId, String type, String zoneGeoId,
            String stockOperator, String stockValue, String tvaId);

    List<String> fetchProduitIds(TUser user, String search, String diciId, String type, String zoneGeoId,
            String stockOperator, String stockValue, String tvaId, boolean onlyReserve);
}
