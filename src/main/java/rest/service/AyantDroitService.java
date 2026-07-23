package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Consultation et changement de statut des ayants droits en REST, en remplacement des JSP
 * webservices/configmanagement/ayantdroit (memes cles JSON, memes filtres) avec une vraie pagination SQL.
 */
@Local
public interface AyantDroitService {

    /**
     * Liste paginee des ayants droits (filtre optionnel par client). actifs=true : statut enable (comportement
     * historique) ; false : les desactives.
     */
    JSONObject list(TUser user, String search, String clientId, boolean actifs, int start, int limit);

    /** Desactivation (actif=false) ou reactivation (actif=true) d'un ayant droit. */
    JSONObject toggleStatus(TUser user, String ayantDroitId, boolean actif);
}
