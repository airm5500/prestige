package rest.service;

import java.util.Collection;
import java.util.Map;
import javax.ejb.Local;
import rest.service.dto.EtatProduit;

/**
 *
 * @author koben
 */
@Local
public interface ProductStateService {

    EtatProduit getEtatProduit(String produitId);

    /**
     * Etat de PLUSIEURS produits en une passe : trois requetes pour toute la liste, au lieu de trois par produit. C'est
     * ce qui rendait la fiche article lente : une page de vingt lignes declenchait soixante allers-retours.
     *
     * @return un etat par identifiant demande - jamais nul, zeros si le produit n'apparait nulle part
     */
    Map<String, EtatProduit> getEtatProduits(Collection<String> produitIds);
}
