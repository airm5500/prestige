package rest.service;

import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TUser;
import java.util.List;
import java.util.Set;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.VenteSuppressionDTO;

/**
 * Tracabilite des produits retires d'une vente et des ventes abandonnees (vente en attente supprimee).
 */
@Local
public interface VenteSuppressionService {

    void logProduitSuppression(TPreenregistrement vente, TPreenregistrementDetail detail, TUser user);

    void logVenteSuppression(TPreenregistrement vente, TUser user);

    /**
     * Trace d'une vente en attente supprimee par le systeme au changement de journee (et non par une personne).
     * L'operateur affiche est {@code Systeme}, ce qui distingue ces lignes des suppressions manuelles dans l'ecran
     * "Suppressions de vente".
     */
    void logVenteSuppressionSysteme(TPreenregistrement vente);

    JSONObject list(String dtStart, String dtEnd, String userId, String query, String type, int start, int limit);

    List<VenteSuppressionDTO> fetchAll(String dtStart, String dtEnd, String userId, String query, String type);

    /**
     * Ensemble des ids produits distincts correspondant aux filtres (pour la creation d'inventaire sur l'ensemble des
     * resultats filtres, toutes pages confondues).
     */
    Set<String> produitIds(String dtStart, String dtEnd, String userId, String query, String type);
}
