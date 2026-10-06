package rest.service;

import dal.TUser;
import java.util.List;
import java.util.Map;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Disponibilite des produits chez un grossiste par PharmaML (plan d'octobre 1.2) : requete d'INFORMATION produit
 * seulement, jamais une commande. Sources : SUGGESTION (t_suggestion_order) ou COMMANDE (t_order).
 */
@Local
public interface DisponibiliteService {

    String SUGGESTION = "SUGGESTION";
    String COMMANDE = "COMMANDE";

    /** Produits a interroger (tous, ou seulement ceux marques non disponibles / autre) et grossiste de la source. */
    JSONObject produits(String source, String sourceId, boolean seulementIndisponibles);

    /**
     * Interroge le grossiste (celui de la source si null) pour 50 produits au plus ; enregistre et rend le resultat.
     */
    JSONObject verifier(String source, String sourceId, String grossisteId, List<String> familleIds, TUser user);

    /** Dernier resultat connu de chaque produit de la source. */
    JSONObject etat(String source, String sourceId);

    /** Lignes a plat pour l'impression. */
    List<Map<String, Object>> lignesImpression(String source, String sourceId);
}
