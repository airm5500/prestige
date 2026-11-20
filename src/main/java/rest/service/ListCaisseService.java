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

    /** Plan du 19/11, point 15 : memes lignes que fetchAll, ventes lues par lots (export de toute une periode). */
    List<VisualisationCaisseDTO> fetchAllExport(CaisseParamsDTO caisseParams);
}
