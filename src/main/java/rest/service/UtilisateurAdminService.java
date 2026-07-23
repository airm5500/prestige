package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Administration des utilisateurs en REST, en remplacement des JSP webservices/sm_user/utilisateur (memes formats JSON
 * {total, results}, memes regles de visibilite et MEME hachage de mot de passe Md5.encode que l'existant).
 */
@Local
public interface UtilisateurAdminService {

    /** Liste paginee des utilisateurs visibles par l'utilisateur connecte. etat=true : tous les emplacements. */
    JSONObject listUsers(TUser connecte, String search, boolean etat, int start, int limit);

    /** Creation d'un utilisateur (login unique, mot de passe hache en MD5 comme le flux de connexion). */
    JSONObject createUser(String login, String password, int ids, String firstName, String lastName, String roleId,
            String languageId, String emplacementId);

    /** Modification d'un utilisateur (identite, langue, emplacement, profil) sans toucher au mot de passe. */
    JSONObject updateUser(String userId, String login, int ids, String firstName, String lastName, String languageId,
            String emplacementId, String roleId);

    /** Reinitialisation du mot de passe d'un utilisateur (hachage MD5 identique a l'existant). */
    JSONObject updatePassword(String userId, String password);

    /**
     * Suppression d'un utilisateur sans activite. Refus explicite (message clair) si l'utilisateur est connecte ou s'il
     * est deja lie a des operations (caisse, ventes...), au lieu de l'erreur de cle etrangere du flux historique.
     */
    JSONObject deleteUser(TUser connecte, String userId);
}
