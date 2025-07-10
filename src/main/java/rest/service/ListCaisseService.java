package rest.service;

import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.SumCaisseDTO;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.v2.dto.VisualisationCaisseDTO;

/**
 *
 * @author koben
 */
@Local
public interface ListCaisseService {

    List<VisualisationCaisseDTO> fetchAll(CaisseParamsDTO caisseParams);

    JSONObject donneeCaisses(CaisseParamsDTO caisseParams);

    List<SumCaisseDTO> fetchSummary(CaisseParamsDTO caisseParams);
}
