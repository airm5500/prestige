package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Panier d'etiquettes de l'ecran « Creation groupee d'etiquette ».
 *
 * <p>
 * Remplace, POUR CET ECRAN SEULEMENT, trois pages JSP restees en place : {@code sm_user/famille/ws_data_jdbc.jsp} pour
 * la liste des articles, et {@code stockmanagement/etiquette/ws_data_detail.jsp} / {@code ws_transaction.jsp} pour le
 * panier. Ces pages servent encore cinq autres ecrans et ne sont pas touchees.
 *
 * <p>
 * Les noms de champs rendus par les deux listes sont ceux qu'attendent les modeles ExtJS existants, y compris leurs
 * bizarreries - notamment {@code lg_FAMILLE_ID} qui porte la DESIGNATION de l'article dans le panier, et non son
 * identifiant. Les changer aurait demande de toucher aux modeles, donc aux autres ecrans.
 *
 * @author koben
 */
@Local
public interface EtiquettePanierService {

    /**
     * Articles proposes dans la liste deroulante, par page.
     *
     * @param user
     *            utilisateur connecte : la recherche est bornee a son emplacement
     * @param recherche
     *            debut de designation, de nom, de CIP, d'EAN13 ou de code article
     */
    JSONObject produits(TUser user, String recherche, int start, int limit);

    /** Lignes du panier d'etiquettes en preparation, par page. */
    JSONObject panier(String recherche, int start, int limit);

    /**
     * Ajoute une quantite d'etiquettes pour un article. Si l'article a deja une ligne en preparation, la quantite s'y
     * ajoute au lieu de creer une seconde ligne.
     */
    JSONObject ajouter(TUser user, String produitId, int quantite);

    /** Fixe la quantite d'une ligne du panier. */
    JSONObject modifierQuantite(String etiquetteId, int quantite);

    /** Retire une ligne du panier. La ligne n'est pas effacee : elle passe au statut supprime, comme auparavant. */
    JSONObject supprimer(String etiquetteId);
}
