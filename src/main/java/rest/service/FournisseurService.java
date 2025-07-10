
package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface FournisseurService {
    JSONObject getAll(String search);
}
