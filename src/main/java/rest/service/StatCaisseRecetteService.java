package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.StatCaisseRecetteDTO;

/**
 *
 * @author koben
 */
@Local
public interface StatCaisseRecetteService {

    List<StatCaisseRecetteDTO> fetchStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId,
            boolean groupByYear, String emplacementId);

    JSONObject getStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId, boolean groupByYear,
            String emplacementId);

}
