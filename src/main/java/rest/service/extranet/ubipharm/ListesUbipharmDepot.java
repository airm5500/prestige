package rest.service.extranet.ubipharm;

import java.util.List;
import javax.persistence.EntityManager;
import org.json.JSONObject;
import rest.service.extranet.commun.DepotListes;
import rest.service.extranet.commun.SourceExtranet;

/**
 * Listes Ubipharm dans {@code extranet_liste_ligne} (depot commun {@link DepotListes}) : derniere collecte COMPLETE
 * rendue ; les lignes des collectes precedentes ne sont retirees qu'apres la fermeture COMPLETE de la nouvelle.
 */
public final class ListesUbipharmDepot {

    private final DepotListes depot;

    public ListesUbipharmDepot(EntityManager em) {
        this.depot = new DepotListes(em);
    }

    public void enregistrer(long collecteId, ListeUbipharm l, List<ListesUbipharmParseur.Ligne> lignes) {
        depot.enregistrer(collecteId, l.name(), lignes);
    }

    /** Refuse si la collecte gardee n'est pas COMPLETE : jamais un cache remplace par une liste incomplete. */
    public int garderSeulement(ListeUbipharm l, long collecteId) {
        return depot.garderSeulement(l.name(), l.module(), collecteId);
    }

    public JSONObject lire(ListeUbipharm l) {
        return depot.lire(SourceExtranet.UBIPHARM, l.name(), l.module(), l.description());
    }

    public int compter(ListeUbipharm l, long collecteId) {
        return depot.compter(l.name(), collecteId);
    }
}
