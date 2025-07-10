package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface TypeMvtCaisseService {

    JSONObject fetchList(int start, int limit, String search);
}
