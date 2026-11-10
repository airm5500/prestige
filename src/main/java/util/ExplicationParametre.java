package util;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retour du 10/11/2026 : explication depliable d'un parametre dans l'ecran des parametres (bouton « i »). Elle est
 * rangee dans la table {@code parametre_explication}, au format JSON :
 *
 * <pre>
 * {"regle": "phrase de regle",
 *  "titre": "titre du tableau des cas (facultatif)",
 *  "entetes": ["Cas", "RO", "RC1", "Client"],
 *  "cas": [["Aucun taux modifie", "800", "200", "0"], ...],
 *  "rappels": ["...", "..."]}
 * </pre>
 *
 * Regle du projet : tout nouveau parametre est livre avec son explication (regle, valeurs possibles, exemples chiffres
 * ou cas d'usage), ecrite d'apres le code qui lit le parametre. Un parametre sans explication n'a pas de bouton.
 */
public final class ExplicationParametre {

    private ExplicationParametre() {
    }

    /**
     * Une explication n'est montree que si elle est lisible et dit quelque chose : un objet JSON avec une regle non
     * vide ; les cas, s'il y en a, sont des tableaux de la largeur des entetes ; les rappels sont des textes.
     */
    public static boolean estValide(String json) {
        if (json == null || json.trim().isEmpty()) {
            return false;
        }
        try {
            JSONObject o = new JSONObject(json);
            if (o.optString("regle", "").trim().isEmpty()) {
                return false;
            }
            JSONArray entetes = o.optJSONArray("entetes");
            JSONArray cas = o.optJSONArray("cas");
            if (o.has("cas") && cas == null) {
                return false;
            }
            for (int i = 0; cas != null && i < cas.length(); i++) {
                JSONArray ligne = cas.optJSONArray(i);
                if (ligne == null || ligne.length() == 0
                        || (entetes != null && entetes.length() > 0 && ligne.length() != entetes.length())) {
                    return false;
                }
            }
            if (o.has("rappels") && o.optJSONArray("rappels") == null) {
                return false;
            }
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }
}
