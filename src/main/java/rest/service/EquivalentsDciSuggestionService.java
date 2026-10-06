package rest.service;

import java.util.List;
import java.util.Map;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Equivalents DCI d'une suggestion (plan d'octobre, 1.1) : analyse en LECTURE SEULE, lancee par un bouton.
 */
@Local
public interface EquivalentsDciSuggestionService {

    /** Analyse complete (ou limitee a une ligne si itemId est renseigne). */
    JSONObject analyser(String suggestionId, String emplacementId, String itemId);

    /** Lignes a plat pour l'impression (une par substitut). */
    List<Map<String, Object>> lignesImpression(String suggestionId, String emplacementId);

    /**
     * Reliquat recalcule par le serveur pour chaque ligne demandee (cle : ligne ; valeur : quantite restant a commander
     * apres couverture). Une ligne sans couverture n'est pas rendue.
     */
    Map<String, Integer> reliquats(String suggestionId, String emplacementId, List<String> itemIds);
}
