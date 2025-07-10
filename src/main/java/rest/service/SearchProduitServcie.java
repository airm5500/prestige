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
            String diciId, String type, int limit, int start);

    JSONObject fetchOrderProduits(TUser user, String produitId, String search, int limit, int start);

}
