package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Gestion des profils (roles) et de l'attribution de leurs privileges en REST, en remplacement des JSP
 * webservices/sm_user/role (memes formats JSON {total, results} et memes regles de visibilite que l'existant).
 */
@Local
public interface RoleService {

    /**
     * Liste paginee des profils visibles par l'utilisateur connecte (recherche libelle/description). actifs=true :
     * profils au statut enable (comportement historique) ; false : les desactives.
     */
    JSONObject listRoles(TUser user, String search, boolean actifs, int start, int limit);

    /**
     * Desactivation (actif=false) ou reactivation (actif=true) d'un profil. Refus pour les profils systeme et pour un
     * profil encore attribue a des utilisateurs. Remplace la suppression definitive cote ecran.
     */
    JSONObject toggleRoleStatus(TUser user, String roleId, boolean actif);

    /** Creation d'un profil. Renvoie {success:"1"|"0", errors}. */
    JSONObject createRole(String name, String designation, String type);

    /** Modification d'un profil (recherche stricte par identifiant). */
    JSONObject updateRole(String roleId, String name, String designation, String type);

    /** Duplication d'un profil : nouveau libelle/description et copie de tous ses privileges. */
    JSONObject duplicateRole(TUser user, String roleId, String name, String designation);

    /**
     * Suppression d'un profil : purge de ses liens privileges puis du profil. Refus explicite (message clair) si le
     * profil est un profil systeme, s'il est attribue a des utilisateurs ou s'il est reference ailleurs.
     */
    JSONObject deleteRole(TUser user, String roleId);

    /**
     * Privileges attribuables a un profil (catalogue scope selon le role de l'utilisateur connecte), pagines, avec
     * l'etat is_select calcule en une seule requete.
     */
    JSONObject rolePrivileges(TUser user, String roleId, String search, int start, int limit);

    /** Attribution (checked=true) ou retrait (checked=false) d'un privilege a un profil. */
    JSONObject toggleRolePrivilege(TUser user, String roleId, String privilegeId, boolean checked);

    /**
     * Attribution ou retrait EN MASSE : tous les privileges du catalogue visibles et correspondant a la recherche
     * courante (toutes pages confondues). Renvoie le nombre de liens crees/supprimes.
     */
    JSONObject toggleAllRolePrivileges(TUser user, String roleId, String search, boolean checked);
}
