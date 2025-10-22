
package rest.service;

import javax.ejb.Local;
import javax.servlet.http.Part;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface DepotService {

    JSONObject importStockDepot(Part part);
}
