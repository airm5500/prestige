package rest.service;

import dal.TUser;
import java.io.IOException;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Suivi de la consommation d'un client par medicament : dates d'achat, quantites moyennes, frequence de renouvellement,
 * montants cumules et habitude d'achat (mensuel, bimensuel, ponctuel, dormant).
 */
@Local
public interface ClientConsommationService {

    JSONObject consommation(String clientId, String dtStart, String dtEnd, String query, int start, int limit);

    JSONObject fetchClients(String dtStart, String dtEnd, String query, String habitude, int start, int limit);

    byte[] exportClientsCsv(String dtStart, String dtEnd, String query, String habitude) throws IOException;

    byte[] exportClientsExcel(String dtStart, String dtEnd, String query, String habitude) throws IOException;

    String printClients(TUser user, String dtStart, String dtEnd, String query, String habitude);

    String printClient(TUser user, String clientId, String dtStart, String dtEnd);
}
