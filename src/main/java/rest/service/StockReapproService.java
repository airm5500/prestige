
package rest.service;

import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface StockReapproService {
    void execute();

    void computeReappro();

}
