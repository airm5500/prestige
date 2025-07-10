package rest.service;

import javax.ejb.Local;
import rest.service.dto.EtatProduit;

/**
 *
 * @author koben
 */
@Local
public interface ProductStateService {

    EtatProduit getEtatProduit(String produitId);
}
