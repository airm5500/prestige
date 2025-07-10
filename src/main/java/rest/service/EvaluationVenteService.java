package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.EvaluationVenteDto;
import rest.service.dto.EvaluationVenteFiltre;

/**
 *
 * @author koben
 */
@Local
public interface EvaluationVenteService {

    List<EvaluationVenteDto> getEvaluationVentes(EvaluationVenteFiltre evaluationVenteFiltre);

    JSONObject fetchEvaluationVentes(EvaluationVenteFiltre evaluationVenteFiltre);

    JSONObject makeSuggestion(EvaluationVenteFiltre evaluationVenteFiltre);
}
