package rest.service.fne;

import javax.ejb.Local;
import rest.service.exception.FneExeception;

/**
 *
 * @author koben
 */
@Local
public interface FneService {

    void createInvoice(String idFacture) throws FneExeception;
}
