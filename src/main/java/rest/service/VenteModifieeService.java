package rest.service;

import dal.TPreenregistrement;
import dal.TUser;
import java.util.Date;
import java.util.List;
import java.util.Set;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.VenteModifieeDTO;
import rest.service.v2.dto.VenteModification;

/**
 * Mouchard des ventes modifiees (point 6) : enregistrement des modifications d'une vente cloturee avec le detail
 * produit, et consultation.
 */
@Local
public interface VenteModifieeService {

    /**
     * Modification des produits : la vente d'origine est annulee et remplacee par sa copie cloturee. Enregistre l'ecart
     * produit par produit entre les deux.
     */
    void enregistrerModificationProduits(TUser user, TPreenregistrement origine, TPreenregistrement copie);

    /** Modification des informations client / tiers payant / numero de bon d'une vente cloturee. */
    void enregistrerModificationInfos(TUser user, TPreenregistrement vente, VenteModification modification);

    /** Modification de la date d'une vente cloturee. */
    void enregistrerModificationDate(TUser user, TPreenregistrement vente, Date avant, Date apres);

    JSONObject list(String dtStart, String dtEnd, String userId, String query, String type, int start, int limit);

    List<VenteModifieeDTO> fetchAll(String dtStart, String dtEnd, String userId, String query, String type);

    /**
     * Produits concernes par les modifications donnees : tous les produits des ventes resultantes, plus les produits
     * retires (qui ne figurent plus sur la vente).
     */
    Set<String> produitIds(List<String> modificationIds);
}
