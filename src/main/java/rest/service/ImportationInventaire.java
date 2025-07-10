package rest.service;

import javax.ejb.Local;
import javax.servlet.http.Part;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface ImportationInventaire {

    JSONObject bulkUpdate(Part part, String idInventaire) throws Exception;

    JSONObject bulkUpdateWithExcel(Part part, String id) throws Exception;
}
