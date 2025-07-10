package rest.service;

import commonTasks.dto.SalesParams;
import dal.TFamille;
import dal.TGrilleRemise;
import dal.TPreenregistrement;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface RemiseService {

    JSONObject addRemise(SalesParams params);

    TGrilleRemise getGrilleRemiseRemiseFromWorkflow(TPreenregistrement preenregistrement, TFamille oFamille,
            String remiseId);
}
