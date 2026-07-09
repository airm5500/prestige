package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Suivi de la consommation d'un client par medicament : dates d'achat, quantites moyennes, frequence de renouvellement,
 * montants cumules et habitude d'achat (mensuel, bimensuel, ponctuel, dormant).
 */
@Local
public interface ClientConsommationService {

    JSONObject consommation(String clientId, String dtStart, String dtEnd, String query, int start, int limit);
}
