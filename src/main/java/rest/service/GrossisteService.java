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

    /** Versions PharmaML du grossiste (information produit, envoi de commande) : 1.0.0.0 ou 3.0.0.0. */
    /**
     * Versions PharmaML et adresse de secours. {@code urlSecours} null = inchangee, vide = retiree ; sinon http(s)://.
     */
    JSONObject versionsPharmaMl(String grossisteId, String versionInfo, String versionCommande, String urlSecours,
            String controle, Boolean disponibilite, String cle);

    /** Desactivation (actif=false) ou reactivation (actif=true) d'un grossiste. */
    JSONObject toggleStatus(TUser user, String grossisteId, boolean actif);
}
