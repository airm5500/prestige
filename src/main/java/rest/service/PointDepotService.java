
package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.PointDepotDTO;

/**
 *
 * @author airman
 */
public interface PointDepotService {

    JSONObject getPointDepot(String dtStart, String dtEnd, String emplacementId);

    byte[] generatePointCaisseReport(String dtStart, String dtEnd, String emplacementId) throws Exception;
}
