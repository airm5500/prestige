package rest.service.fne;

import javax.ejb.Local;
import rest.service.exception.FneExeception;

/**
 *
 * @author koben
 */
@Local
public interface FneService {

    void createInvoice(String idFacture, TypeInvoice typeInvoice) throws FneExeception;

    void createGroupeInvoice(String idFactures, TypeInvoice typeInvoice);
}
