package rest.service;

import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Actions de l'ecran Etat de stock : creation d'une nouvelle suggestion manuelle a partir du resultat de la recherche
 * (les produits sont regroupes par fournisseur, une suggestion par fournisseur, quantites prealimentees et modifiables
 * ensuite dans Suggerer commande).
 */
@Local
public interface EtatStockService {

    /** Cree de nouvelles suggestions manuelles (une par fournisseur) pour les produits donnes. */
    JSONObject creerSuggestion(TUser user, List<String> familleIds);
}
