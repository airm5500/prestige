
package rest.service;

import java.util.List;
import java.util.Map;
import rest.service.dto.AnalyseInvDTO;

/**
 *
 * @author airman
 */
public interface AnalyseInvService {
    List<AnalyseInvDTO> analyseInventaire(String inventaireId);

    Map<String, Object> getAnalyseAvanceeData(String inventaireId);
}
