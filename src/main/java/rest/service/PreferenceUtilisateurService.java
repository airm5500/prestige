package rest.service;

import javax.ejb.Local;

/**
 * Preferences d'un utilisateur (disposition du tableau de bord, choix de la cloche...), conservees en base d'une
 * connexion a l'autre. Valeur JSON libre ; la cle est limitee a des caracteres simples.
 */
@Local
public interface PreferenceUtilisateurService {

    /** Taille maximale d'une valeur (caracteres). */
    int TAILLE_MAX = 200_000;

    /** Valeur enregistree, ou null si aucune. */
    String lire(String userId, String cle);

    void ecrire(String userId, String cle, String valeur);

    void supprimer(String userId, String cle);

    static boolean cleValide(String cle) {
        return cle != null && cle.matches("[A-Za-z0-9_.-]{1,80}");
    }
}
