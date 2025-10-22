package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface TiersPayantService {

    JSONObject fetchList(int start, int limit, String search, String typeTierspayant, boolean btnDesactive,
            boolean delete);

    int getAccount(String tp);
}
