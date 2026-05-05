
package rest.service;

import commonTasks.dto.AddLot;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.LotDTO;

/**
 *
 * @author Hermann N'ZI
 */
@Local
public interface LotService {

    JSONObject getAllLots(String dtStart, String dtEnd, int start, int limit);

    JSONObject getAllLots();

    List<LotDTO> getAllLots(String dtStart, String dtEnd, int limit, int start, boolean all);

    void pickLot(String produitId, int quantitVendue);

    void addLot(AddLot addLot);
}
