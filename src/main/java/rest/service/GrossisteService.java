package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Consultation et changement de statut des grossistes en REST, en remplacement des JSP
 * webservices/configmanagement/grossiste (memes cles JSON, memes regles) avec une vraie pagination SQL.
 */
@Local
public interface GrossisteService {

    /** Liste paginee des grossistes. actifs=true : statut enable (comportement historique) ; false : desactives. */
    JSONObject list(TUser user, String search, boolean actifs, int start, int limit);

    /** Desactivation (actif=false) ou reactivation (actif=true) d'un grossiste. */
    JSONObject toggleStatus(TUser user, String grossisteId, boolean actif);
}
