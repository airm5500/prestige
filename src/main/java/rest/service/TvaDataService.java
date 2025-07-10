
package rest.service;

import commonTasks.dto.Params;
import commonTasks.dto.TvaDTO;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface TvaDataService {

    List<TvaDTO> statistiqueTvaWithSomeCriteria(Params params);

    List<TvaDTO> statistiqueTva(Params params);

    JSONObject statistiqueTvaView(Params params);

    JSONObject statistiqueTvaViewSomeCriteria(Params params);

    List<TvaDTO> statistiqueTvaGroupByDayWithSomeCriteria(Params params);

    List<TvaDTO> statistiqueGroupByDayTva(Params params);

    JSONObject statistiqueTvaGroupByDayViewSomeCriteria(Params params);

    List<TvaDTO> statistiqueTvaWithSomeTiersPayantToExclude(Params params);

    boolean isExcludTiersPayantActive();

    JSONObject statistiqueTvaVnoOnlyView(Params params);

    List<TvaDTO> tvaVnoData(Params params);

    List<TvaDTO> statistiqueTvaVnoGroupByDayTva(Params params);

    List<TvaDTO> tvaVnoDatas(Params params);
}
