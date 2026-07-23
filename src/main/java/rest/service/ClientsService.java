package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Consultation des clients en REST, en remplacement de la JSP webservices/configmanagement/client/ws_data.jsp (memes
 * cles JSON que clientManagement.getClients) mais avec des requetes regroupees par page au lieu de plusieurs requetes
 * par ligne : l'affichage est beaucoup plus rapide, sans changement de comportement.
 */
@Local
public interface ClientsService {

    /**
     * Liste paginee des clients. actifs=true : statut enable (comportement historique) ; false : les desactives.
     * btnDelete / btnDesactiver : privileges de l'utilisateur connecte (calcules dans la ressource depuis la session).
     */
    JSONObject listClients(String search, String typeClientId, boolean actifs, boolean btnDelete, boolean btnDesactiver,
            int start, int limit);
}
