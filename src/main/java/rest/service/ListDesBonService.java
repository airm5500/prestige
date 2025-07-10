package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.BonsDTO;
import rest.service.dto.BonsParam;
import rest.service.dto.BonsTotauxDTO;

/**
 *
 * @author koben
 */
@Local
public interface ListDesBonService {

    List<BonsDTO> listAllBons(BonsParam bonsParam);

    JSONObject listBons(BonsParam bonsParam);

    BonsTotauxDTO listBonsTotaux(BonsParam bonsParam);
}
