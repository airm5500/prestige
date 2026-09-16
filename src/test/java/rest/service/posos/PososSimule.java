package rest.service.posos;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.ws.rs.core.Form;
import javax.ws.rs.core.HttpHeaders;

/**
 * Serveur Posos simule.
 *
 * <p>
 * La forme exacte de l'API reelle n'a pas pu etre verifiee : la documentation de Posos n'est pas joignable depuis
 * l'environnement de developpement et les acces de recette ne sont pas encore fournis. Ce simulateur joue donc le
 * PROTOCOLE (OAuth2 client_credentials, puis appel porteur) plutot qu'un format precis, et les tests l'interrogent avec
 * plusieurs formes de reponse possibles pour verifier que la lecture les accepte toutes.
 *
 * <p>
 * Il tient aussi le registre de ce qu'il a recu : c'est ce qui permet de verifier qu'aucune donnee identifiante ne
 * part, et que les produits sont bien envoyes par leur nom.
 */
class PososSimule implements PososClient.Appelant {

    /** Ce que le simulateur rendra a l'appel d'analyse. */
    String corpsAnalyse = "{\"alerts\":[]}";
    int statutAnalyse = 200;
    int statutJeton = 200;
    String corpsJeton = "{\"access_token\":\"jeton-simule\",\"expires_in\":3600}";
    /** Nombre de fois ou un jeton a ete demande : sert a prouver la mise en cache. */
    int appelsJeton;
    int appelsAnalyse;
    /** Premier appel d'analyse en 401, pour verifier que le jeton est repris une fois. */
    boolean refuserLePremierAppel;

    final List<String> corpsRecus = new ArrayList<>();
    final List<String> autorisationsRecues = new ArrayList<>();
    final List<String> urlsAppelees = new ArrayList<>();
    Form dernierFormulaire;

    @Override
    public PososClient.Reponse poster(String url, Map<String, String> entetes, Form formulaire, int delaiMs) {
        appelsJeton++;
        urlsAppelees.add(url);
        dernierFormulaire = formulaire;
        autorisationsRecues.add(entetes.get(HttpHeaders.AUTHORIZATION));
        return new PososClient.Reponse(statutJeton, corpsJeton);
    }

    @Override
    public PososClient.Reponse posterJson(String url, Map<String, String> entetes, String corps, int delaiMs) {
        appelsAnalyse++;
        urlsAppelees.add(url);
        corpsRecus.add(corps);
        autorisationsRecues.add(entetes.get(HttpHeaders.AUTHORIZATION));
        if (refuserLePremierAppel && appelsAnalyse == 1) {
            return new PososClient.Reponse(401, "{\"error\":\"expired\"}");
        }
        return new PososClient.Reponse(statutAnalyse, corpsAnalyse);
    }

    /** Les valeurs d'un parametre du dernier formulaire envoye. */
    List<String> parametre(String nom) {
        List<String> valeurs = new ArrayList<>();
        if (dernierFormulaire != null) {
            List<String> v = dernierFormulaire.asMap().get(nom);
            if (v != null) {
                valeurs.addAll(v);
            }
        }
        return valeurs;
    }
}
