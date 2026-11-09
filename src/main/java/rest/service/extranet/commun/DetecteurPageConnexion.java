package rest.service.extranet.commun;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

/**
 * Reconnait une page de connexion servie a la place des donnees, y compris avec un statut 200 (plan du 07/11, §2).
 * Critere retenu tant que les formulaires de connexion n'ont pas ete captures : un champ mot de passe dans la page.
 * jsoup n'execute aucun script.
 */
public final class DetecteurPageConnexion {

    private DetecteurPageConnexion() {
    }

    public static boolean estRedirection(int statut) {
        return statut == 301 || statut == 302 || statut == 303 || statut == 307 || statut == 308;
    }

    /** 401 et 403 : la session n'est plus reconnue. */
    public static boolean estRefus(int statut) {
        return statut == 401 || statut == 403;
    }

    /** Vrai si le texte est une page HTML portant un formulaire de connexion. */
    public static boolean estPageConnexion(String texte) {
        if (texte == null || texte.indexOf('<') < 0) {
            return false;
        }
        String bas = texte.toLowerCase();
        if (!bas.contains("password")) {
            return false;
        }
        Document d = Jsoup.parse(texte);
        return !d.select("input[type=password]").isEmpty();
    }
}
