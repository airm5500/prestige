package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Gestion des emplacements (zones geographiques) en REST, en remplacement des JSP
 * webservices/configmanagement/zonegeographique (memes formats JSON {total, results}, memes regles de visibilite et
 * memes controles metier que l'existant : unicite du code par officine, statut enable par defaut).
 */
@Local
public interface ZoneGeographiqueService {

    /**
     * Liste paginee des emplacements visibles par l'utilisateur connecte (recherche code/libelle). actifs=true : statut
     * enable (comportement historique) ; false : les desactives (reserve aux administrateurs).
     */
    JSONObject list(TUser user, String search, boolean actifs, int start, int limit);

    /** Creation d'un emplacement (code unique par officine, statut enable, prise en compte comptage par defaut). */
    JSONObject create(TUser user, String code, String libelle);

    /** Modification du code et du libelle (unicite du code preservee). */
    JSONObject update(TUser user, String zoneId, String code, String libelle);

    /** Prise en compte ou non de l'emplacement dans le comptage (colonne bool_ACCOUNT, regle historique). */
    JSONObject updateCount(String zoneId, boolean boolAccount);

    /**
     * Desactivation (actif=false) ou reactivation (actif=true) d'un emplacement. L'emplacement par defaut (code
     * 'Default') est protege. Remplace la suppression definitive cote ecran.
     */
    JSONObject toggleStatus(TUser user, String zoneId, boolean actif);

    /** Desactivation ou reactivation EN MASSE d'une liste d'identifiants. Renvoie le nombre traite. */
    JSONObject toggleStatusMasse(TUser user, String zoneIds, boolean actif);
}
