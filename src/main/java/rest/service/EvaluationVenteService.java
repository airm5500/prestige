package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.EvaluationVenteDto;
import rest.service.dto.EvaluationVenteFiltre;
import java.io.IOException;
import org.json.JSONException;

/**
 *
 * @author koben
 */
@Local
public interface EvaluationVenteService {

    List<EvaluationVenteDto> getEvaluationVentes(EvaluationVenteFiltre evaluationVenteFiltre);

    JSONObject fetchEvaluationVentes(EvaluationVenteFiltre evaluationVenteFiltre);

    JSONObject makeSuggestion(EvaluationVenteFiltre evaluationVenteFiltre);

    byte[] exportEvaluationVentesCsv(EvaluationVenteFiltre evaluationVenteFiltre) throws IOException;

    byte[] exportEvaluationVentesExcel(EvaluationVenteFiltre evaluationVenteFiltre) throws IOException;

    JSONObject createInventaire(EvaluationVenteFiltre evaluationVenteFiltre) throws JSONException;
}
