package rest.service;

import commonTasks.dto.MontantAPaye;
import commonTasks.dto.SalesParams;
import commonTasks.dto.TiersPayantParams;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import java.util.List;
import java.util.Map;
import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface SalesNetComputingService {

    MontantAPaye computeVONet(SalesParams params);

    MontantAPaye calculeRepair(TPreenregistrement op,
            List<TPreenregistrementCompteClientTiersPayent> compteClientTiersPayents,
            Map<String, List<TiersPayantParams>> tpsBons);// juste pour une maintenance du 01/11/2025
}
