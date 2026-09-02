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

    JSONObject fetchClients(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy, int start, int limit);

    byte[] exportClientsCsv(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy) throws IOException;

    byte[] exportClientsExcel(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy) throws IOException;

    String printClients(TUser user, String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy);

    String printClient(TUser user, String clientId, String dtStart, String dtEnd);

    /** Export Excel de la consommation par medicament d'un client (memes filtres que la grille). */
    byte[] exportConsommationExcel(String clientId, String dtStart, String dtEnd, String query) throws IOException;

    // ---------------------------------------------------------------- point 2 : recherche multicritere

    JSONObject fetchClients(rest.service.dto.ConsoFiltres filtres, int start, int limit);

    byte[] exportClientsCsv(rest.service.dto.ConsoFiltres filtres) throws IOException;

    byte[] exportClientsExcel(rest.service.dto.ConsoFiltres filtres) throws IOException;

    String printClients(TUser user, rest.service.dto.ConsoFiltres filtres);

    /** Population complete du resultat multicritere (memes lignes que la grille, toutes pages confondues). */
    java.util.List<commonTasks.dto.ClientConsoDTO> population(rest.service.dto.ConsoFiltres filtres);

    /** Clients par identifiants (dedoublonnes), avec telephone et consentement relus en base. */
    java.util.List<commonTasks.dto.ClientConsoDTO> clientsParIds(java.util.Collection<String> ids);

    /**
     * Inventaire des produits de la consommation affichee, nomme « INVENTAIRE PRODUITS CONSO CLIENTS &lt;horodatage&gt;
     * ».
     */
    JSONObject createInventaireConsommation(String clientId, String dtStart, String dtEnd, String query);
}
