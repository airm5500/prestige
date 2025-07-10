package rest.service;

import commonTasks.dto.VenteDTO;
import dal.Caution;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.AddCautionDTO;
import rest.service.dto.CautionDTO;
import rest.service.dto.CautionHistoriqueDTO;

/**
 *
 * @author koben
 */
@Local
public interface CautionTiersPayantService {

    JSONObject addCaution(AddCautionDTO addCaution) throws Exception;

    JSONObject update(AddCautionDTO addCaution) throws Exception;

    JSONObject supprimerCaution(String idCaution) throws Exception;

    void updateCaution(Caution caution, int saleAmount);

    List<CautionDTO> fetch(String tiersPayantId, int start, int limit, boolean all);

    JSONObject fetch(String tiersPayantId, int start, int limit);

    List<VenteDTO> getVentes(String idCaution, String dtStart, String dtEnd);

    JSONObject getVentesView(String idCaution, String dtStart, String dtEnd);

    List<CautionHistoriqueDTO> getHistoriques(String idCaution, String dtStart, String dtEnd);

    JSONObject getHistoriquesView(String idCaution, String dtStart, String dtEnd);

    Caution getCautionById(String idCaution);
}
