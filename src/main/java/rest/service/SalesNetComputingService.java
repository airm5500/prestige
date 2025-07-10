
package rest.service;

import commonTasks.dto.MontantAPaye;
import commonTasks.dto.SalesParams;
import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface SalesNetComputingService {

    MontantAPaye computeVONet(SalesParams params, boolean asPlafondActivated);
}
