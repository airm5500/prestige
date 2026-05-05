package rest.service;

import java.util.Set;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface MainteanceService {

    JSONObject getDoublonsFamilleGrossistes();

    void remove(Set<String> ids);

    void remoteFamilleGrossiste(String ids);

    void addConstraint() throws Exception;

    int updateVoAmount();

}
