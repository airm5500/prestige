package rest.service;

import java.io.IOException;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.EtatControlAnnuelWrapperDTO;
import rest.service.dto.EtatControlBon;
import rest.service.dto.EtatControlBonEditDto;

/**
 *
 * @author koben
 */
@Local
public interface EtatControlBonService {

    List<EtatControlBon> list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            int start, int limit, boolean all);

    JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit);

    EtatControlAnnuelWrapperDTO listBonAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId);

    JSONObject listBonAnnuelView(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId);

    JSONObject etatLastThreeYears();

    JSONObject updateBon(EtatControlBonEditDto bonEdit);

    byte[] generate(String search, String dtStart, String dtEnd, String grossisteId) throws IOException;

    byte[] generate(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId)
            throws IOException;

}
