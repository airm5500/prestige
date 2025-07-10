package rest.service;

import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.SummaryDTO;
import commonTasks.dto.VenteDTO;
import java.util.List;
import javax.ejb.Local;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface StatistiqueRemiseService {

    JSONObject suiviRemise(SalesStatsParams params) throws JSONException;

    Pair<SummaryDTO, List<VenteDTO>> exportationSuiviRemise(SalesStatsParams params);
}
