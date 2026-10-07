package rest.service;

import dal.TUser;
import java.io.InputStream;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Telephones (plan d'octobre, lot L13) : jeton signe, pointage mobile, photos des produits. Seuls les nouveaux chemins
 * v1/mobile/* l'utilisent ; les chemins mobiles existants (X-User-Info) sont inchanges.
 */
@Local
public interface MobileService {

    /** Identifiants + appareil : jeton signe, ou refus. */
    JSONObject connexion(String login, String motDePasse, String appareil, String nomAppareil, String adresse);

    /** Utilisateur du jeton (signature, expiration, terminal actif, compte actif), sinon null. */
    TUser authentifier(String jeton, String adresse);

    /** Terminal du jeton deja verifie (pour la tracabilite du pointage). */
    String terminalDuJeton(String jeton);

    JSONObject moi(TUser user);

    JSONObject pointer(TUser user, String terminal, JSONObject saisie);

    JSONObject mesPointages(TUser user);

    JSONObject produits(String recherche);

    JSONObject ajouterPhoto(TUser user, String familleId, InputStream flux, boolean principale);

    /* --- gestion depuis l'ecran RH --- */

    /** Code de pointage courant (pour le QR affiche a l'officine) et reglages du pointage mobile. */
    JSONObject codePointage();

    JSONObject terminaux();

    JSONObject changerTerminal(String id, boolean actif, TUser operateur);

    /** Regenere la cle : tous les jetons en circulation deviennent invalides. */
    JSONObject revoquerTousLesJetons();
}
