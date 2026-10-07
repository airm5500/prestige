package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Monographies DS Pharmagora (VIDAL) : posologie, composition, contre-indications, interactions... Le site n'est
 * interroge que par le serveur ; chaque fiche lue est gardee en base (t_monographie) pour ne pas le solliciter a chaque
 * consultation et rester utilisable s'il ne repond plus.
 */
@Local
public interface MonographieService {

    String ACTIF = "KEY_MONOGRAPHIE_ACTIF";
    String URL = "KEY_MONOGRAPHIE_URL";
    String JOURS = "KEY_MONOGRAPHIE_JOURS";
    String DELAI = "KEY_MONOGRAPHIE_DELAI_SEC";
    String INTERACTIONS_VENTE = "KEY_INTERACTIONS_VENTE";

    /** {actif, interactionsVente, rubriques[]} : ce que l'interface doit proposer. */
    JSONObject etat();

    /** Fiche d'un article pour une rubrique ; {@code relire} force la relecture du site (cache ignore). */
    JSONObject fiche(String familleId, int rubrique, boolean relire);

    /** Interactions entre les articles donnes (rubrique 3 de chacun) : {alertes[], sansFiche[]}. */
    JSONObject interactions(List<String> familleIds);

    /**
     * Interactions entre les articles d'une vente en cours, seulement si l'alerte a la vente est activee
     * ({@value #INTERACTIONS_VENTE}) : sinon {success, active: false}.
     */
    JSONObject interactionsVente(String venteId);
}
