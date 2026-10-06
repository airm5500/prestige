package rest.service;

import dal.TUser;
import java.util.Collection;
import java.util.Map;
import javax.ejb.Local;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Centre de notifications (la cloche ; plan d'octobre, section 7, lot L9) : catalogue des categories, compteurs agreges
 * en une seule requete, listes des nouvelles categories. Lecture seule.
 */
@Local
public interface NotificationsCentreService {

    /** Categories proposees (cle, libelle, icone, couleur, menu lie, existante / nouvelle). */
    JSONArray catalogue();

    /**
     * Compteurs des categories demandees. Les trois categories historiques reprennent les compteurs (ou les criteres)
     * des routes que la cloche appelait jusqu'ici ; une categorie inconnue est ignoree.
     */
    Map<String, Long> compteurs(TUser user, boolean voirToutesLesVentes, boolean toutesActivites,
            Collection<String> cles);

    /** Elements d'une nouvelle categorie pour le panneau : {total, results:[{titre, detail, date}]}. */
    JSONObject liste(String cle, TUser user, int limite);
}
